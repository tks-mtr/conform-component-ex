# API設計書: 通知既読化

## 1. 概要

- **担当レイヤー:** NestJS
- **目的:** 指定したジョブの通知を既読状態（`is_notified = true`）に更新する。
- **呼出元:** ユーザーが通知モーダルを閉じたタイミングでクライアントから呼ばれる。通信エラー時はクライアント側で指数バックオフによるリトライを実施する（最大3回）。

---

## 2. パス

```
/notifications/:jobId/read
```

```
jobId: string — 既読化するジョブの識別子（job_results.job_id）
```

---

## 3. メソッド

```
POST
```

---

## 4. アクター制御

- **認証方式:** BFFからの内部通信（同一ネットワーク内に閉じる。外部公開しない）
- **アクセス可能なロール:** BFF（クライアントからBFF経由で呼ばれる想定）

---

## 5. リクエスト

### 5-1. ヘッダー

| ヘッダー名 | 必須 | 値・説明 |
|-----------|------|---------|
| - | - | 特になし |

### 5-2. パラメータ

**パスパラメータ**

| パラメータ名 | 型 | 必須 | 説明 |
|------------|---|------|------|
| jobId | string | ✅ | 既読化するジョブのID |

### 5-3. ボディ

なし

---

## 6. レスポンス

### 6-1. ヘッダー

| ヘッダー名 | 値 |
|-----------|---|
| - | 特になし（ボディなし） |

### 6-2. 正常系

| ステータスコード | 説明 |
|---------------|------|
| 204 No Content | 既読化成功（レスポンスボディなし） |

### 6-3. エラー（異常系）

| ステータスコード | 説明 | 発生条件 |
|---------------|------|---------|
| 404 | Not Found | 指定した `jobId` のレコードが `job_results` に存在しない |
| 500 | Internal Server Error | DB接続エラー等のサーバー内部エラー |

**エラーレスポンスサンプル（404）**

```json
{
  "statusCode": 404,
  "message": "jobId: job-test-999 が見つかりません"
}
```

---

## 7. 関連テーブル

| テーブル名 | 操作 | 条件 |
|-----------|------|------|
| job_results | UPDATE | `job_id = jobId` |

---

## 8. 処理概要

### 処理フロー

```
1. パスパラメータ jobId を受け取る
2. job_results テーブルの該当レコードを更新
   - is_notified = true
   - updated_at = 現在日時
3. 更新件数が0件の場合 → 404 NotFoundException をスロー
4. 204 No Content を返却
```

### DBクエリ

```sql
UPDATE job_results
SET is_notified = 1,
    updated_at = datetime('now')
WHERE job_id = :jobId
RETURNING id;
-- 結果が0件の場合は404
```

### クライアント側リトライ仕様

| 項目 | 内容 |
|------|------|
| リトライ回数 | 最大3回 |
| リトライ戦略 | 指数バックオフ |
| 最終失敗時 | 次回リロード時に未読として再表示（フェイルセーフ） |

---

## 動作確認コマンド

```bash
# 既読化（事前にトリガーでjob-test-001を作成しておくこと）
curl -X POST http://localhost:3001/notifications/job-test-001/read

# 存在しないjobIdで404を確認
curl -X POST http://localhost:3001/notifications/job-not-exist/read
```

---

## 実装ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/notifications/notifications.controller.ts` | エンドポイント定義（`POST /notifications/:jobId/read`） |
| `backend/src/notifications/notifications.service.ts` | `markAsNotified()` ロジック |
| `backend/src/db/schema.ts` | `job_results` テーブル定義 |