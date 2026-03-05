# Redis PubSub リアルタイム通知 実装ワークフロー

> 対応設計書: `docs/features/20260302_Redis_PubSub/Functional Requirements.md`
> 作成日: 2026-03-02
> 改訂: 2026-03-05 テスト技術スタック・各PhaseにUT項目を追加

---

## 1. プロジェクト概要

外部システムの非同期処理結果（ファイル連携）をリアルタイムにブラウザへプッシュ通知するシステムを構築する。

**処理フロー概要:**

```
外部システム（モック）
  └─ ファイル連携
       └─ Watcher（モック）: ファイル検知
            └─ NestJS（バックエンドAPI）
                 ├─ DB更新: ステータス更新 & is_notified = false
                 └─ Redis PUBLISH: `job:completed` チャンネルへペイロード配信
                      └─ BFF（React Router v7）: Redis SUBSCRIBE
                           └─ SSE: ブラウザへプッシュ通知
                                └─ クライアント: 通知モーダル表示 → 確認 → 既読化API呼出（NestJS）
```

**主な要件:**

- SSE切断中の通知欠損を防止（DBによる永続化 + loader時のサルベージ）
- ユーザー操作を妨げないグローバル通知UI
- 既読化APIの通信エラー時はクライアント側でリトライ

---

## 2. 技術スタック

| カテゴリ | 選定技術 | 備考 |
|---------|---------|------|
| BFF / フロントエンド | React Router v7（フルスタック） | 画面レンダリング・SSE配信を担当 |
| バックエンドAPI | NestJS | DB操作・Redis PUBLISH・既読化APIを担当 |
| 言語 | TypeScript | 全レイヤー共通 |
| メッセージブローカー | Redis 7（redis:7-alpine） | Docker Compose 設定済み |
| Redisクライアント | `redis`（node-redis） | Redis公式クライアント、PubSub対応、型定義付き |
| DB | SQLite + Drizzle ORM | `is_notified` フラグの永続化に使用 |
| UIコンポーネント | shadcn/ui（Radix UI + Tailwind CSS） | 既存コンポーネント群を活用 |
| バリデーション | Zod | 既存の schema.ts パターンに合わせる |
| コンテナ | Docker Compose | Redis サービス定義済み |

> **Redisライブラリ選定理由:** Redis公式クライアント `redis`（node-redis）を採用。PubSub用には `client.duplicate()` でサブスクライバー専用接続を生成して分離する。

---

## 3. DB設計

### 3-1. 新規テーブル: `job_results`

外部システムの処理結果と通知フラグを永続化するテーブル。NestJS側で管理する。

```
job_results
├─ id             TEXT  PRIMARY KEY  (例: UUID)
├─ job_id         TEXT  NOT NULL     (予約ID、外部システム側の識別子)
├─ user_id        TEXT  NOT NULL     (対象のユーザーID)
├─ status         TEXT  NOT NULL     ('processing' | 'completed' | 'failed')
├─ payload        TEXT              (完了時の処理結果JSON文字列)
├─ is_notified    INTEGER NOT NULL DEFAULT 0  (0=未読, 1=既読)
├─ created_at     TEXT  NOT NULL
└─ updated_at     TEXT  NOT NULL
```

> 現プロジェクトはDBを未使用（モックデータのみ）のため、Drizzle ORM + SQLite を新規導入する。
> 開発初期はスキーマのみ定義し、モック関数でインメモリ代替も許容する。

### 3-2. 対象ファイル（NestJS側）

| ファイルパス | 内容 |
|-------------|------|
| `backend/src/db/schema.ts` | Drizzle ORM スキーマ定義 |
| `backend/src/db/index.ts` | DB接続インスタンス |
| `backend/src/db/migrations/` | マイグレーションSQL |

---

## 4. ビジネスロジック

### 4-1. Watcher（ファイル監視モック）→ NestJS

```
1. モックイベントをトリガー（NestJSのHTTPエンドポイントへPOST）
2. NestJS がリクエストを受け、job_results テーブルに処理結果を INSERT
   - user_id = '(対象のユーザーID)'
   - status = 'completed'
   - is_notified = false (0)
3. NestJS が Redis の `job:completed` チャンネルへ PUBLISH
   - payload: { jobId, userId, status, result }
```

### 4-2. BFF（React Router v7）: Redis SUBSCRIBE → SSE 配信

> **※重要（コネクション肥大化対策）**
> BFFプロセス全体でRedisへの `SUBSCRIBE` 用コネクションは**1つ（シングルトン）**のみ維持する。
> 受信したメッセージはNode.js標準の `EventEmitter` を介して各SSEクライアントへルーティングする。

```
1. アプリ起動時に BFFが Redis の `job:completed` チャンネルを1つだけ SUBSCRIBE
2. クライアントからの新規SSE接続（および自動再接続）確立時の初期化処理
   a. ストリームの返却を開始。
   b. **【重要: 瞬断時の欠損対策】** 直近で取りこぼした未読データがないか、1回だけNestJSの未読取得API（またはDB経由等）へ問い合わせる。
   c. 未読データが存在した場合、即座にSSEストリームへ初回データとして流し込む。
   d. 以降はEventEmitterからのイベントPushを待機する。
3. メッセージ（Redis → EventEmitter）のイベント受信時:
   a. イベントペイロードから `userId` を抽出
   b. 自分（対象の `userId` ）宛てのイベントであればSSEクライアントへ送信
      - event: 'job-completed'
      - data: { jobId, result }
4. SSE接続管理（個別のリクエスト）:
   - クライアントごとに Response ストリームを Map で管理
   - 接続切断時はクリーンアップ
```

### 4-3. クライアント: SSE受信 → モーダル表示 → 既読化

```
1. EventSource で /api/sse/notifications に接続（BFF）
2. 'job-completed' イベント受信時:
   a. 通知モーダルを表示
3. ユーザーがモーダルを閉じる:
   a. 既読化API ( POST /api/notifications/:jobId/read ) をNestJSへ呼出
   b. エラー時は指数バックオフでリトライ（最大3回）
   c. リトライ全失敗時 → 次回リロード時に再表示（フェイルセーフ）
```

### 4-4. loader: リロード時のサルベージ

```
root.tsx の loader 関数内（BFF）:
1. NestJS の未読通知取得APIへリクエスト
2. is_notified = false かつログインユーザーの user_id に合致するレコードが存在する場合:
   a. フロントエンドへデータを渡す
   b. クライアント側で通知モーダルを表示
   c. （未読だけでなく処理中レコードが存在する場合も含む）SSE接続が切れている場合は再接続を開始する
```

---

## 5. 画面設計

### 5-1. 共通レイアウト（`app/root.tsx`）

- SSEコネクションの維持をグローバルに管理
- `useNotification` カスタムフックを通じて通知状態を管理
- `<NotificationModal>` コンポーネントをオーバーレイ表示

### 5-2. 通知モーダル: `NotificationModal`

```
┌─────────────────────────────────────────┐
│  処理が完了しました                        │
│                                          │
│  予約ID: xxxx-yyyy-zzzz                  │
│  ステータス: 完了                          │
│  [結果の詳細情報...]                      │
│                                          │
│              [  確認  ]                  │
└─────────────────────────────────────────┘
```

- shadcn/ui の `<Dialog>` コンポーネントをベースに実装
- 複数通知が同時に届いた場合はキュー管理して順次表示

### 5-3. UI状態管理

| 状態 | 型 | 説明 |
|------|---|------|
| `notifications` | `Notification[]` | 未表示の通知キュー |
| `currentNotification` | `Notification \| null` | 現在表示中の通知 |
| `sseStatus` | `'connecting' \| 'connected' \| 'disconnected'` | SSE接続状態 |

---

## 6. API設計

### 担当レイヤーの整理

| エンドポイント | 担当 | 説明 |
|--------------|------|------|
| `GET /api/sse/notifications` | BFF（React Router v7） | SSEストリーム配信 |
| `GET /notifications/pending` | NestJS | 未読通知一覧取得（loaderから呼出） |
| `POST /notifications/:jobId/read` | NestJS | 既読化 |
| `POST /mock/trigger-job` | NestJS | Watcherモックトリガー（開発用） |

### 6-1. SSEエンドポイント（BFF）

| 項目 | 内容 |
|------|------|
| エンドポイント | `GET /api/sse/notifications` |
| 認証 | セッションCookieによる認証チェック |
| レスポンス | `Content-Type: text/event-stream` |
| イベント形式 | `event: job-completed\ndata: {"jobId":"...", "result":{...}}\n\n` |

### 6-2. 未読通知取得API（NestJS）

| 項目 | 内容 |
|------|------|
| エンドポイント | `GET /notifications/pending` |
| 呼出元 | React Router v7 の `root.tsx` loader |
| レスポンス | `JobResult[]`（`is_notified = false` のレコード） |

### 6-3. 既読化API（NestJS）

| 項目 | 内容 |
|------|------|
| エンドポイント | `POST /notifications/:jobId/read` |
| 呼出タイミング | ユーザーがモーダルを閉じたとき |
| バックエンド処理 | `is_notified` を `1 (true)` に更新 |
| リクエスト | パスパラメータ: `jobId` |
| レスポンス | `200 OK` \| `404 Not Found` \| `500 Internal Server Error` |
| エラー時 | クライアント側でバックグラウンドリトライ（最大3回・指数バックオフ） |

### 6-4. Watcherモックトリガーエンドポイント（NestJS・開発用）

| 項目 | 内容 |
|------|------|
| エンドポイント | `POST /mock/trigger-job` |
| 用途 | 開発・デモ用の処理完了イベント手動発火 |
| リクエストBody | `{ "jobId": "string", "userId": "string", "result": {} }` |
| 処理 | DB INSERT + Redis PUBLISH を実行 |

---

## 7. ディレクトリ構成

### BFF / フロントエンド（React Router v7）

```
app/
├── components/
│   ├── layout/
│   │   └── Header.tsx              # 既存
│   └── notifications/
│       ├── NotificationModal.tsx   # 新規: 通知モーダル本体
│       └── NotificationProvider.tsx # 新規: SSE管理・状態配布のプロバイダー
│
├── hooks/
│   └── useNotification.ts          # 新規: 通知状態管理カスタムフック
│
├── lib/
│   ├── redis.ts                    # 新規: node-redis クライアント（シングルトン）
│   └── notification-emitter.ts     # 新規: EventEmitter（Redis受信→SSEへの分配用）
│
├── models/
│   └── schema.ts                   # 既存（変更なし）
│
├── routes/
│   ├── home.tsx                    # 既存（変更なし）
│   ├── assign.tsx                  # 既存（変更なし）
│   ├── user-list.tsx               # 既存（変更なし）
│   └── api.sse.notifications.ts    # 新規: SSEエンドポイント（EventEmitterを購読）
│
├── root.tsx                        # 変更: loaderでNestJS照会 + NotificationProvider 組込
└── routes.ts                       # 変更: 新規ルート追加
```

### バックエンドAPI（NestJS）

```
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── db/
│   │   ├── index.ts                # DB接続インスタンス
│   │   ├── schema.ts               # Drizzle ORM スキーマ（job_results）
│   │   └── migrations/             # マイグレーションSQL
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts  # GET /notifications/pending, POST /notifications/:id/read
│   │   ├── notifications.service.ts     # DB操作ロジック
│   │   └── dto/
│   │       └── job-result.dto.ts
│   ├── mock/
│   │   ├── mock.module.ts
│   │   ├── mock.controller.ts      # POST /mock/trigger-job
│   │   └── mock.service.ts         # DB INSERT + Redis PUBLISH
│   └── redis/
│       ├── redis.module.ts
│       └── redis.service.ts        # node-redis クライアント管理
├── package.json
└── tsconfig.json
```

---

## 8. 開発フェーズ

### テスト技術スタック

| レイヤー | フレームワーク | 実行コマンド |
|---------|--------------|------------|
| BFF/フロントエンド（`app/`） | Vitest + React Testing Library | `npm test`（ルート） |
| バックエンド（`backend/`） | Jest + @nestjs/testing | `npm test`（`backend/`内） |

### テスト方針

- **タイミング:** 各Phaseの実装コミット直後に、対応するUTをコミットする（実装とテストを同一Phaseで完結させる）
- **カバレッジ基準:**
  - ステートメントカバレッジ: **80%以上**
  - ビジネスロジックを持つ Service クラス: **90%以上**
  - 正常系・異常系（エラーハンドリング）の両方をテストすること
- **モック方針:**
  - UT（Phase 2〜4）: Redis・DB・fetchはすべてモック化する
  - 結合テスト（Phase 5）: Docker ComposeでRedis・DBを実際に起動して全フローを検証する
  - NestJS の Service テストは `@nestjs/testing` の `TestingModule` を使用する

---

### Phase 1: 基盤整備（依存関係・DB・Redis）

**目標:** 両プロジェクトの共通基盤を構築

- [ ] NestJS プロジェクトの初期セットアップ (`nest new backend`)
- [ ] `redis`（node-redis）のインストール（BFF・NestJS 両方）
  - BFF: `npm install redis`
  - NestJS: `npm install redis`
- [ ] Drizzle ORM + SQLite のインストール（NestJS側）
  - `npm install drizzle-orm better-sqlite3`
- [ ] `backend/src/db/schema.ts` の作成（`job_results` テーブル定義）
- [ ] `backend/src/db/index.ts` の作成（DB接続インスタンス）
- [ ] マイグレーション実行スクリプトの追加
- [ ] `app/lib/redis.ts` の作成（BFF用・シングルトン）
- [ ] `app/lib/notification-emitter.ts` の作成（BFF内ルーティング用EventEmitter）
- [ ] BFF起動時の `SUBSCRIBE` 処理実装（`server.ts` または適当な初期化フック）
- [ ] `backend/src/redis/redis.service.ts` の作成（NestJS用・PUBLISH専用）
- [ ] compose.yml に NestJS サービスを追加
- [ ] テスト環境セットアップ（Vitest + RTL / Jest）

### Phase 2: NestJSバックエンド実装

**目標:** DB操作・Redis PUBLISH・各APIの構築

- [ ] `backend/src/notifications/notifications.service.ts` の作成
  - `getPendingNotifications()` 関数
  - `markAsNotified(jobId)` 関数
- [ ] `backend/src/notifications/notifications.service.spec.ts` の作成（UT）
- [ ] `backend/src/notifications/notifications.controller.ts` の作成
  - `GET /notifications/pending`
  - `POST /notifications/:jobId/read`
- [ ] `backend/src/notifications/notifications.controller.spec.ts` の作成（UT）
- [ ] `backend/src/mock/mock.service.ts` の作成
  - DB INSERT + Redis PUBLISH の統合
- [ ] `backend/src/mock/mock.service.spec.ts` の作成（UT）
- [ ] `backend/src/mock/mock.controller.ts` の作成
  - `POST /mock/trigger-job`

### Phase 3: BFF（React Router v7）実装

**目標:** Redis SUBSCRIBEとSSE配信の構築

- [ ] `app/routes/api.sse.notifications.ts` の作成
  - **初期データ同期:** ストリーム開始直後に、NestJSの未読取得API（`GET /notifications/pending`）を呼び出し、過去数秒の瞬断で取りこぼした未読通知を流し込む。
  - **購読設定:** EventEmitter を購読し、自分宛てのイベントのみをSSEストリームに流す処理
  - **クリーンアップ:** 接続切断時のクリーンアップ（`request.signal.addEventListener('abort')` で listener を削除し、メモリリークを防止）
- [ ] `app/routes/api.sse.notifications.test.ts` の作成（UT）
- [ ] `app/root.tsx` の変更
  - `loader` に NestJS の未読通知取得API呼出を追加
  - `<NotificationProvider>` の組込

### Phase 4: フロントエンド実装（UI・UX）

**目標:** ユーザーに通知を表示するUI実装

- [ ] `app/hooks/useNotification.ts` の作成
  - EventSource の初期化・切断管理
  - 通知キューの状態管理
  - 既読化APIコール（NestJS）＋リトライロジック（指数バックオフ）
- [ ] `app/hooks/useNotification.test.ts` の作成（UT）
- [ ] `app/components/notifications/NotificationModal.tsx` の作成
  - shadcn/ui `<Dialog>` ベースのモーダル
  - 複数通知のキュー表示制御
- [ ] `app/components/notifications/NotificationModal.test.tsx` の作成（UT）
- [ ] `app/components/notifications/NotificationProvider.tsx` の作成
  - Context による通知状態の全体共有

### Phase 5: 結合テスト・品質確認

**目標:** 全フローの動作確認と異常系の検証

- [ ] 正常系: Watcherモック → NestJS → Redis PUBLISH → SSE → モーダル表示 → 既読化
- [ ] 異常系1: SSE接続切断中にWatcherが発火 → 再接続後にloaderがサルベージ
- [ ] 異常系2: 既読化API失敗 → リトライ → 最終失敗 → 次回リロードで再表示
- [ ] 異常系3: Redis接続エラー時のエラーハンドリング確認
- [ ] compose.yml でのDocker統合動作確認（BFF + NestJS + Redis）

---

## 9. 考慮事項・備考

### セキュリティ

| 項目 | 内容 |
|------|------|
| SSE認証 | セッションCookieによる認証チェックをSSEエンドポイント（BFF）で実施 |
| NestJS API認証 | BFFからNestJSへの内部通信はサービス間トークン or 同一ネットワーク内に閉じる（外部公開しない） |
| ユーザー分離 | SSEはログインユーザーIDに紐づくジョブのみ配信する（他ユーザーの通知が混入しないよう制御） |
| Redis接続 | 接続情報は環境変数 `REDIS_URL` で管理（compose.yml 設定済み）。コードへのハードコード禁止 |
| SQLiteファイル | コンテナ外のボリュームにマウントし、ビルド毎に消去されない設計にする |

### パフォーマンス

| 項目 | 内容 |
|------|------|
| SSE接続数の制御 | ログイン期間中は常時接続をベースとするが、リロード時等の一時切断からの復帰時は loaderで「処理中 or 未読データ」の存在をトリガーに確実に再接続フローを回し、不要な放置コネクションを抑制する |
| Redisコネクション肥大化対策 | BFFからのRedis `SUBSCRIBE` 接続はアプリ全体で1つ（シングルトン）とする。個別のSSEリクエスト毎にRedisへの接続・SUBSCRIBEは行わず、Node.jsの `EventEmitter` を介して分配する |
| EventEmitter のメモリリーク | クライアント切断時（`request.signal` の `abort` イベント）に必ず `emitter.off()` でリスナーを削除する |

### React Router v7 実装上の注意点

| 項目 | 内容 |
|------|------|
| SSEのルートファイル | `loader` は通常の `Response` を返すが、SSEは `ReadableStream` を持つ `Response` を返す。`headers` に `Content-Type: text/event-stream` を明示的に設定すること |
| loader での副作用 | `root.tsx` の loader はSSR時にも実行されるため、NestJS API呼出コードはサーバー専用処理として分岐を明確にする |
| EventSource のURL | クライアントサイドで `new EventSource('/api/sse/notifications')` を使用。Remix/React Router では `useFetcher` との使い分けに注意 |

### BFF / NestJS 責務分界点

| 責務 | BFF（React Router v7） | NestJS |
|------|----------------------|--------|
| 画面レンダリング | ○ | — |
| SSE配信（Redis SUBSCRIBE） | ○ | — |
| 未読通知取得 | loaderから呼出 | APIとして提供 |
| 既読化処理 | クライアントから呼出を中継 | APIとして提供 |
| DB操作 | — | ○ |
| Redis PUBLISH | — | ○ |
| Watcherモック | — | ○ |

### インフラ環境の前提

| 項目 | 内容 |
|------|------|
| ホスティング | **AWS ECS (Fargate)** などの常駐型コンテナ環境を前提とする。Serverless Functionsのような数十秒単位の強制タイムアウトを回避し、SSEの安定したロングコネクション（常時接続）を維持できる構成とする。 |

### 非機能要件

| 項目 | 内容 |
|------|------|
| 通知の順序保証 | Redis PubSubはメッセージ順序を保証しないため、タイムスタンプベースでのソートをクライアント側で実施 |
| 接続数上限 | SSEはHTTP/1.1環境ではブラウザタブ当たり最大6接続の制限あり。ドメインが複数ある場合は注意 |
| SQLiteの並行書込み | SQLite はデフォルトで WAL モードを使用し並行読取りを最大化する。書込みロックの競合に注意 |
