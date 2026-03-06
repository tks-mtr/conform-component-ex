# API設計書: 未読通知一覧取得

## 1. 概要

- **担当レイヤー:** NestJS
- **目的:** ログインユーザーの未読通知（`is_notified = false`）を一覧取得する。SSE切断中に発生したジョブ完了イベントを取りこぼさないためのサルベージ用API。
- **呼出元:**
  - BFF `root.tsx` の `loader`（ページリロード・初回アクセス時）
  - BFF SSEエンドポイント（`GET /api/sse/notifications`）の接続確立時

---

## 2. パス

```
/notifications/pending
```

---

## 3. メソッド

```
GET
```

---

## 4. アクター制御

- **認証方式:** BFFからの内部通信（同一ネットワーク内に閉じる。外部公開しない）
- **アクセス可能なロール:** BFF（サービス間通信）

---

## 5. リクエスト

### 5-1. ヘッダー

| ヘッダー名 | 必須 | 値・説明 |
|-----------|------|---------|
| - | - | 特になし |

### 5-2. パラメータ

**クエリパラメータ**

| パラメータ名 | 型 | 必須 | 説明 |
|------------|---|------|------|
| userId | string | ✅ | 未読通知を取得するユーザーのID |

### 5-3. ボディ

なし

---

## 6. レスポンス

### 6-1. ヘッダー

| ヘッダー名 | 値 |
|-----------|---|
| Content-Type | `application/json` |

### 6-2. 正常系

| ステータスコード | 説明 |
|---------------|------|
| 200 OK | 取得成功（未読なしの場合は空配列） |

**レスポンスモデル**

```ts
type JobResultDto = {
  id: string                              // レコードID（UUID）
  jobId: string                           // ジョブの識別子
  userId: string                          // 対象ユーザーID
  status: 'processing' | 'completed' | 'failed'  // ジョブステータス
  payload: string | null                  // 処理結果JSON文字列
  isNotified: boolean                     // 既読フラグ（常にfalse）
  createdAt: string                       // 作成日時（ISO 8601）
  updatedAt: string                       // 更新日時（ISO 8601）
}

type Response = JobResultDto[]
```

**サンプル**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "jobId": "job-test-001",
    "userId": "user-001",
    "status": "completed",
    "payload": "{\"message\":\"処理完了\"}",
    "isNotified": false,
    "createdAt": "2026-03-06T10:00:00.000Z",
    "updatedAt": "2026-03-06T10:00:00.000Z"
  }
]
```

未読なしの場合:

```json
[]
```

### 6-3. エラー（異常系）

| ステータスコード | 説明 | 発生条件 |
|---------------|------|---------|
| 500 | Internal Server Error | DB接続エラー等のサーバー内部エラー |

---

## 7. 関連テーブル

| テーブル名 | 操作 | 条件 |
|-----------|------|------|
| job_results | SELECT | `user_id = userId AND is_notified = false` |

---

## 8. 処理概要

### 処理フロー

```
1. クエリパラメータ userId を受け取る
2. job_results テーブルから以下の条件でレコードを取得
   - user_id = userId
   - is_notified = false（未読のみ）
3. 取得結果を配列で返却（0件の場合は空配列）
```

### DBクエリ

```sql
SELECT * FROM job_results
WHERE user_id = :userId
  AND is_notified = 0;
```

---

## 動作確認コマンド

```bash
# 未読通知一覧取得
curl "http://localhost:3001/notifications/pending?userId=user-001"
```

**事前にトリガーでデータを作成しておく場合:**

```bash
curl -X POST http://localhost:3001/mock/trigger-job -H "Content-Type: application/json" -d '{"jobId":"job-test-001","userId":"user-001","result":{"message":"処理完了"}}'
```

---

## 実装ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/notifications/notifications.controller.ts` | エンドポイント定義（`GET /notifications/pending`） |
| `backend/src/notifications/notifications.service.ts` | `getPendingNotifications()` ロジック |
| `backend/src/db/schema.ts` | `job_results` テーブル定義 |