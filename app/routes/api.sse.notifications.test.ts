import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notificationEmitter } from '../lib/notification-emitter'

// fetch をモック化
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// モジュールの動的インポートでloaderを取得
async function importLoader() {
  const mod = await import('./api.sse.notifications')
  return mod.loader
}

/**
 * SSEストリームから指定ミリ秒間チャンクを収集して文字列として返す。
 * SSEはストリームが閉じないため、done待ちではなく時間ベースで読み取る。
 *
 * @param reader - ReadableStreamDefaultReader
 * @param decoder - TextDecoder
 * @param durationMs - 収集する時間（ミリ秒）
 * @returns 収集したSSEテキスト
 */
async function readSSEChunksFor(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  durationMs: number,
): Promise<string> {
  let output = ''
  const deadline = Date.now() + durationMs

  while (Date.now() < deadline) {
    const timeout = new Promise<{ done: true; value: undefined }>((resolve) =>
      setTimeout(() => resolve({ done: true, value: undefined }), deadline - Date.now()),
    )
    const result = await Promise.race([reader.read(), timeout])
    if (result.done || !result.value) break
    output += decoder.decode(result.value)
  }

  return output
}

/**
 * SSE loader のテスト用ヘルパー。
 * AbortController付きのリクエストを生成する。
 *
 * @param userId - クエリパラメータに付与するuserId
 * @returns request と abort を呼ぶ関数のペア
 */
function makeRequest(userId: string | null) {
  const controller = new AbortController()
  const url = userId
    ? `http://localhost/api/sse/notifications?userId=${userId}`
    : 'http://localhost/api/sse/notifications'
  const request = new Request(url, { signal: controller.signal })
  return { request, abort: () => controller.abort() }
}

describe('api.sse.notifications loader', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    notificationEmitter.removeAllListeners()
  })

  it('userIdがない場合は400を返す', async () => {
    const loader = await importLoader()
    const { request } = makeRequest(null)
    const res = await loader({ request, params: {}, context: {} } as Parameters<typeof loader>[0])
    expect(res.status).toBe(400)
  })

  it('userIdがある場合はSSEレスポンスを返す', async () => {
    const loader = await importLoader()
    const { request, abort } = makeRequest('user-001')

    const resPromise = loader({ request, params: {}, context: {} } as Parameters<typeof loader>[0])

    // 少し待ってからabortして接続を閉じる
    setTimeout(abort, 50)
    const res = await resPromise

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
  })

  it('接続確立時にNestJS未読APIを呼び出す', async () => {
    const loader = await importLoader()
    const { request, abort } = makeRequest('user-002')

    const resPromise = loader({ request, params: {}, context: {} } as Parameters<typeof loader>[0])

    // fetch完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 50))
    abort()
    await resPromise

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/notifications/pending?userId=user-002'),
    )
  })

  it('未読通知がある場合はストリームに流し込む', async () => {
    const pendingNotifications = [
      { jobId: 'job-001', result: { message: 'done' } },
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => pendingNotifications,
    })

    const loader = await importLoader()
    const { request, abort } = makeRequest('user-003')

    const res = await loader({ request, params: {}, context: {} } as Parameters<typeof loader>[0])
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    // SSEはストリームが閉じないため、一定時間内に受信できたチャンクを収集する
    const output = await readSSEChunksFor(reader, decoder, 200)

    abort()

    expect(output).toContain('job-completed')
    expect(output).toContain('job-001')
  })

  it('自分のuserIdのjob-completedイベントのみSSEに流す', async () => {
    const loader = await importLoader()
    const { request, abort } = makeRequest('user-target')

    const res = await loader({ request, params: {}, context: {} } as Parameters<typeof loader>[0])
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    // 非対象ユーザーのイベント
    notificationEmitter.emit('job-completed', {
      jobId: 'job-other',
      userId: 'user-other',
      status: 'completed',
      result: {},
    })

    // 対象ユーザーのイベント
    notificationEmitter.emit('job-completed', {
      jobId: 'job-mine',
      userId: 'user-target',
      status: 'completed',
      result: { message: 'ok' },
    })

    const output = await readSSEChunksFor(reader, decoder, 200)
    abort()

    expect(output).toContain('job-mine')
    expect(output).not.toContain('job-other')
  })

  it('接続切断時にEventEmitterのlistenerが削除される', async () => {
    const loader = await importLoader()
    const { request, abort } = makeRequest('user-cleanup')

    await loader({ request, params: {}, context: {} } as Parameters<typeof loader>[0])

    const listenersBefore = notificationEmitter.listenerCount('job-completed')
    abort()

    // abort後のlistener数を確認
    await new Promise((resolve) => setTimeout(resolve, 20))
    const listenersAfter = notificationEmitter.listenerCount('job-completed')

    expect(listenersAfter).toBeLessThan(listenersBefore)
  })
})