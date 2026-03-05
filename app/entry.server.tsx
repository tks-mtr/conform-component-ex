import { PassThrough } from 'node:stream'
import type { AppLoadContext, EntryContext } from 'react-router'
import { createReadableStreamFromReadable } from '@react-router/node'
import { ServerRouter } from 'react-router'
import { renderToPipeableStream } from 'react-dom/server'
import { connectRedis, subscriberClient } from './lib/redis'
import { notificationEmitter, type JobCompletedPayload } from './lib/notification-emitter'

// BFF起動時に1度だけ実行: Redis接続 & SUBSCRIBE開始
let redisInitialized = false

async function initRedis() {
  if (redisInitialized) return
  redisInitialized = true

  try {
    await connectRedis()

    await subscriberClient.subscribe('job:completed', (message) => {
      try {
        const payload = JSON.parse(message) as JobCompletedPayload
        notificationEmitter.emit('job-completed', payload)
      } catch {
        console.error('[Redis] メッセージのパースに失敗:', message)
      }
    })

    console.log('[Redis] SUBSCRIBEを開始しました: job:completed')
  } catch (err) {
    console.error('[Redis] 初期化に失敗しました:', err)
    redisInitialized = false
  }
}

// サーバーモジュール読み込み時に初期化
initRedis()

const ABORT_DELAY = 5000

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onShellReady() {
          shellRendered = true
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set('Content-Type', 'text/html')

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          )

          pipe(body)
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          if (shellRendered) {
            console.error(error)
          }
        },
      },
    )

    setTimeout(abort, ABORT_DELAY)
  })
}