import type { LoaderFunctionArgs } from 'react-router'
import { notificationEmitter, type JobCompletedPayload } from '../lib/notification-emitter'

const NESTJS_BASE_URL = process.env.NESTJS_BASE_URL ?? 'http://localhost:3001'

/**
 * SSE形式のデータ文字列を生成する。
 *
 * @param event - SSEイベント名
 * @param data - 送信するJSONシリアライズ可能なデータ
 * @returns SSEプロトコル形式の文字列
 */
function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * SSEストリームでクライアントへリアルタイム通知を配信するエンドポイント。
 *
 * 接続確立時に未読通知をNestJSから取得して初期送信し、
 * 以降はEventEmitter経由でRedis PubSubメッセージを受信してストリームに流す。
 * クライアント切断時はlistenerを削除してメモリリークを防止する。
 *
 * @param request - SSEリクエスト（クエリパラメータ userId を参照）
 * @returns text/event-stream レスポンス
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return new Response('userId is required', { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      /**
       * SSEストリームにデータを書き込む。
       *
       * @param event - SSEイベント名
       * @param data - 送信するデータ
       */
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(formatSSE(event, data)))
      }

      // 接続確立を通知
      send('connected', { message: 'SSE接続が確立されました' })

      // 初期データ同期: 瞬断中の取りこぼし未読通知を流し込む
      fetch(`${NESTJS_BASE_URL}/notifications/pending?userId=${encodeURIComponent(userId)}`)
        .then((res) => {
          if (!res.ok) throw new Error(`NestJS pending API error: ${res.status}`)
          return res.json() as Promise<unknown[]>
        })
        .then((pending) => {
          for (const notification of pending) {
            send('job-completed', notification)
          }
        })
        .catch((err) => {
          console.error('[SSE] 未読通知の初期取得に失敗:', err)
        })

      /**
       * EventEmitterからjob-completedイベントを受信し、
       * 対象ユーザー宛てのみSSEストリームへ送信するリスナー。
       *
       * @param payload - Redisから受信したジョブ完了ペイロード
       */
      function onJobCompleted(payload: JobCompletedPayload) {
        if (payload.userId !== userId) return
        send('job-completed', { jobId: payload.jobId, result: payload.result })
      }

      notificationEmitter.on('job-completed', onJobCompleted)

      // クライアント切断時のクリーンアップ
      request.signal.addEventListener('abort', () => {
        notificationEmitter.off('job-completed', onJobCompleted)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}