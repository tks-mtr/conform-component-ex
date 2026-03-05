import { createClient } from 'redis'

// ベースクライアント（他クライアントの親。直接操作には使用しない）
const baseClient = createClient({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
})

// PubSub用クライアント（SUBSCRIBE専用）
export const subscriberClient = baseClient.duplicate()

// データストア用クライアント（将来のGET/SET等で使用）
export const dataStoreClient = baseClient.duplicate()

/**
 * 全Redisクライアントを接続する。
 * BFF起動時に1度だけ呼び出すこと。
 */
export const connectRedis = async () => {
  await Promise.all([
    baseClient.connect(),
    subscriberClient.connect(),
    dataStoreClient.connect(),
  ])
}
