# API設計書: SSE通知ストリーム

## 1. 概要

- **担当レイヤー:** BFF（React Router v7）
- **目的:** クライアントとのSSE（Server-Sent Events）コネクションを確立し、ジョブ完了通知をリアルタイムにプッシュ配信する。接続確立時に未読通知の初期同期も行う。
- **呼出元:** クライアント（ブラウザ）が `EventSource` を通じて接続する。ページロード時またはSSE切断からの自動再接続時に呼ばれる。

---

## 2. パス

```
/api/sse/notifications
```

---

## 3. メソッド

```
GET
```

---

## 4. アクター制御

- **認証方式:** セッションCookieによる認証チェック（TODO: 現時点は `userId` クエリパラメータで代替）
- **アクセス可能なロール:** ログイン済みユーザー

---

## 5. リクエスト

### 5-1. ヘッダー

| ヘッダー名 | 必須 | 値・説明 |
|-----------|------|---------|
| Cookie | △ | セッションCookie（認証実装後に必須） |

### 5-2. パラメータ

**クエリパラメータ**

| パラメータ名 | 型 | 必須 | 説明 |
|------------|---|------|------|
| userId | string | ✅ | 通知を受け取るユーザーのID |

### 5-3. ボディ

なし

---

## 6. レスポンス

### 6-1. ヘッダー

| ヘッダー名 | 値 |
|-----------|---|
| Content-Type | `text/event-stream` |
| Cache-Control | `no-cache` |
| Connection | `keep-alive` |
| X-Accel-Buffering | `no`（nginxプロキシ経由時のバッファリング無効化） |

### 6-2. 正常系

接続確立後、以下のSSEイベントをストリームとして送信し続ける。

**接続確立イベント**

```
event: connected
data: {"message":"SSE接続が確立されました"}
```

**ジョブ完了イベント**（Redis経由 or 初期同期）

```
event: job-completed
data: {"jobId":"xxx-yyy-zzz","result":{"message":"処理完了"}}
```

**ジョブ完了イベントのデータモデル**

```ts
type JobCompletedData = {
  jobId: string                  // ジョブの識別子
  result: Record<string, unknown> // 処理結果オブジェクト
}
```

### 6-3. ボディ（異常系）

| ステータスコード | 説明 | 発生条件 |
|---------------|------|---------|
| 400 | Bad Request | `userId` クエリパラメータが未指定 |

```
HTTP/1.1 400 Bad Request

userId is required
```

---

## 7. 関連テーブル

直接のDB操作なし。
接続確立時に NestJS の `GET /notifications/pending` を経由して `job_results` テーブルを参照する。

| テーブル名 | 操作 | 備考 |
|-----------|------|------|
| job_results | SELECT（間接） | NestJS API経由で未読通知を取得 |

---

## 8. 処理概要

### 処理フロー

```
1. クエリパラメータ userId の存在チェック（なければ400）
2. ReadableStream を生成してレスポンスを返却（ストリーム開始）
3. 接続確立イベント（connected）を送信
4. 【初期データ同期】NestJS GET /notifications/pending を呼び出し
   - 未読通知が存在する場合、job-completed イベントとしてストリームへ流し込む
   - 取得失敗時はエラーログを出力して継続（ストリームは維持）
5. EventEmitter の job-completed イベントを購読
   - payload.userId が自分宛てのもののみ SSE クライアントへ送信
6. クライアント切断時（request.signal の abort イベント）:
   - EventEmitter のリスナーを削除（メモリリーク防止）
   - ストリームをクローズ
```

### 設計上のポイント

- **シングルトン接続:** BFFプロセス全体でRedisへのSUBSCRIBE接続は1つのみ。個別SSEリクエストごとにRedis接続は行わず、`EventEmitter` を介して各クライアントへ分配する。
- **初期同期の目的:** SSE切断中に発生したジョブ完了イベントの取りこぼしを防ぐ。
- **ユーザー分離:** `payload.userId` によるフィルタリングで、他ユーザーの通知が混入しないよう制御する。

---

## 動作確認コマンド

```bash
# SSE接続（ストリーム受信待機）
curl -N "http://localhost:5173/api/sse/notifications?userId=user-001"

# 別ターミナルでジョブをトリガーすると job-completed イベントが届く
curl -X POST http://localhost:3001/mock/trigger-job -H "Content-Type: application/json" -d '{"jobId":"job-test-001","userId":"user-001","result":{"message":"処理完了"}}'
```

**期待するSSEストリーム出力:**

```
event: connected
data: {"message":"SSE接続が確立されました"}

event: job-completed
data: {"jobId":"job-test-001","result":{"message":"処理完了"}}
```

---

## 実装ファイル

| ファイル | 役割 |
|---------|------|
| `app/routes/api.sse.notifications.ts` | SSEエンドポイント本体 |
| `app/lib/notification-emitter.ts` | BFF内イベントバス（EventEmitter） |
| `app/lib/redis.ts` | Redis SUBSCRIBEクライアント（シングルトン） |
| `app/entry.server.tsx` | 起動時のRedis接続・SUBSCRIBE初期化 |
