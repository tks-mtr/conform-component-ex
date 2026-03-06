# API設計書: Watcherモックトリガー

## 1. 概要

- **担当レイヤー:** NestJS
- **目的:** 外部システム（Watcher）によるジョブ完了イベントを手動で模倣する開発・デモ用エンドポイント。DB INSERTとRedis PUBLISHを実行し、BFF経由でブラウザへSSEプッシュ通知が届くことを検証する。
- **呼出元:** 開発者が手動でcurl等から呼び出す（本番環境では使用しない）

---

## 2. パス

```
/mock/trigger-job
```

---

## 3. メソッド

```
POST
```

---

## 4. アクター制御

- **認証方式:** 認証なし（開発・デモ環境限定。本番環境では公開しないこと）
- **アクセス可能なロール:** 開発者

---

## 5. リクエスト

### 5-1. ヘッダー

| ヘッダー名 | 必須 | 値・説明 |
|-----------|------|---------|
| Content-Type | ✅ | `application/json` |

### 5-2. パラメータ

なし

### 5-3. ボディ

**データモデル**

```ts
type TriggerJobDto = {
  jobId: string                       // ジョブの識別子
  userId: string                      // 通知対象のユーザーID
  result: Record<string, unknown>     // クライアントに通知する処理結果
}
```

**サンプル**

```json
{
  "jobId": "job-test-001",
  "userId": "user-001",
  "result": {
    "message": "処理完了"
  }
}
```

---

## 6. レスポンス

### 6-1. ヘッダー

| ヘッダー名 | 値 |
|-----------|---|
| - | 特になし（ボディなし） |

### 6-2. 正常系

| ステータスコード | 説明 |
|---------------|------|
| 204 No Content | 処理成功（DB INSERT + Redis PUBLISH 完了） |

### 6-3. エラー（異常系）

| ステータスコード | 説明 | 発生条件 |
|---------------|------|---------|
| 500 | Internal Server Error | DB接続エラー・Redis接続エラー等 |

---

## 7. 関連テーブル

| テーブル名 | 操作 | 内容 |
|-----------|------|------|
| job_results | INSERT | ジョブ完了レコードを新規登録 |

**INSERTされるデータ:**

| カラム | 値 |
|--------|---|
| id | UUID（自動生成） |
| job_id | リクエストの `jobId` |
| user_id | リクエストの `userId` |
| status | `'completed'` 固定 |
| payload | `result` をJSON文字列化したもの |
| is_notified | `false`（0） |
| created_at | 現在日時 |
| updated_at | 現在日時 |

---

## 8. 処理概要

### 処理フロー

```
1. リクエストボディ（jobId, userId, result）を受け取る
2. 【DB INSERT】job_results テーブルへ完了レコードを登録
   - status = 'completed'
   - is_notified = false
3. 【Redis PUBLISH】'job:completed' チャンネルへペイロードを配信
   - payload: { jobId, userId, status: 'completed', result }
4. 204 No Content を返却
```

### Redis PUBLISHペイロード

```json
{
  "jobId": "job-test-001",
  "userId": "user-001",
  "status": "completed",
  "result": { "message": "処理完了" }
}
```

このペイロードはBFFがSUBSCRIBEしており、`EventEmitter` を介して対象ユーザーのSSEストリームへ配信される。

---

## 動作確認コマンド

```bash
# ジョブ完了イベントをトリガー
curl -X POST http://localhost:3001/mock/trigger-job -H "Content-Type: application/json" -d '{"jobId":"job-test-001","userId":"user-001","result":{"message":"処理完了"}}'
```

**SSE接続中のターミナルに届く期待値:**

```
event: job-completed
data: {"jobId":"job-test-001","result":{"message":"処理完了"}}
```

---

## 実装ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/mock/mock.controller.ts` | エンドポイント定義（`POST /mock/trigger-job`） |
| `backend/src/mock/mock.service.ts` | DB INSERT + Redis PUBLISH ロジック |
| `backend/src/redis/redis.service.ts` | Redis PUBLISHクライアント |
| `backend/src/db/schema.ts` | `job_results` テーブル定義 |
