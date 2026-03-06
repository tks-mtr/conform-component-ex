# 開発ログ

## 2026-03-05 | Phase 3 実装（BFF SSEエンドポイント）

### 実装内容

| ファイル | 内容 |
|---------|------|
| `app/routes/api.sse.notifications.ts` | SSEエンドポイント実装 |
| `app/routes/api.sse.notifications.test.ts` | UT（Vitest、6テスト全通過） |
| `app/root.tsx` | loaderにNestJS未読通知API呼出を追加 |
| `app/routes.ts` | `api/sse/notifications` ルートを追加 |
| `backend/src/db/index.ts` | 起動時自動マイグレーションを追加 |
| `backend/nest-cli.json` | マイグレーションファイルをassetsとしてdistにコピー |
| `backend/.gitignore` | `db/*.db` を除外 |

---

### 苦戦したところ

#### 1. SQLite DBディレクトリが存在しなかった
- **症状:** NestJS起動時に `Cannot open database because the directory does not exist`
- **原因:** `db/app.db` のパスに対して `backend/db/` ディレクトリが未作成だった
- **解決:** `mkdir -p backend/db` で作成

#### 2. マイグレーションファイルが見つからなかった
- **症状:** 起動時に `Can't find meta/_journal.json file`
- **原因①:** `__dirname` が期待通りに解決されず、`dist/db/` を見ていた
- **原因②:** `nest start --watch` はソースを直接実行するが、`__dirname` の解決が不安定
- **解決:** `path.resolve(process.cwd(), 'src/db/migrations')` に変更（watch・本番両対応）

#### 3. NestJSのポートが3000ではなく3001だった
- **症状:** curlで `Failed to connect to localhost port 3000`
- **原因:** `main.ts` のデフォルトポートが3001、BFF側の `NESTJS_BASE_URL` デフォルトが3000のままだった
- **解決:** BFFの `NESTJS_BASE_URL` デフォルト値を `localhost:3001` に修正

#### 4. BFFのポートが3000ではなく5173だった
- **原因:** Vite開発サーバーのデフォルトポートは5173
- **ポート整理:**

  | サービス | ポート |
  |---------|--------|
  | BFF (Vite dev) | 5173 |
  | NestJS | 3001 |
  | Redis | 6379 |

#### 5. SSEテストのタイムアウト
- **症状:** `reader.read()` を `while (!done)` で回すとタイムアウト
- **原因:** SSEはストリームが閉じないため `done` が返らない
- **解決:** 時間ベースで読み取る `readSSEChunksFor()` ヘルパーを実装

---

### うまくいったところ

- SSE接続確立 → Redisイベント受信 → クライアント配信の全フローが一発で動いた
- EventEmitterのシングルトン設計（コネクション肥大化防止）がそのまま機能した
- Vitestのテスト設計（fetch・EventEmitterのモック化）がきれいに書けた

---

### 動作確認コマンド

**前提:** Redis・NestJS・BFF がすべて起動済みであること。

```bash
# Redis（Docker）
docker compose up redis

# NestJS
cd backend && npm run start:dev

# BFF
npm run dev
```

#### SSE接続（ターミナル1）

```bash
curl -N "http://localhost:5173/api/sse/notifications?userId=user-001"
```

期待するレスポンス:
```
event: connected
data: {"message":"SSE接続が確立されました"}
```

#### ジョブトリガー（ターミナル2）

```bash
curl -X POST http://localhost:3001/mock/trigger-job \
  -H "Content-Type: application/json" \
  -d '{"jobId":"job-test-001","userId":"user-001","result":{"message":"処理完了"}}'
```

#### ターミナル1に届く期待値

```
event: job-completed
data: {"jobId":"job-test-001","result":{"message":"処理完了"}}
```

#### NestJS APIの単体確認

```bash
# 未読通知一覧（userId指定）
curl "http://localhost:3001/notifications/pending?userId=user-001"

# 既読化
curl -X POST "http://localhost:3001/notifications/job-test-001/read"
```

---

### 次回: Phase 4（フロントエンドUI実装）

- `app/hooks/useNotification.ts` — EventSource管理・通知キュー・既読化リトライ
- `app/components/notifications/NotificationModal.tsx` — shadcn/ui Dialog
- `app/components/notifications/NotificationProvider.tsx` — Context配布

---

## 2026-03-06 | API設計書の作成

### 作成内容

| ファイル | 内容 |
|---------|------|
| `API_design_structure_project.md` | API設計書の共通テンプレート（骨組み＋肉付け） |
| `api_design_workflow.md` | 設計書作成計画・チェックリスト |
| `API_design/sse_notifications.md` | GET /api/sse/notifications |
| `API_design/notifications_pending.md` | GET /notifications/pending |
| `API_design/notifications_read.md` | POST /notifications/:jobId/read |
| `API_design/mock_trigger_job.md` | POST /mock/trigger-job |

### 作成の流れ

1. 既存の2つのテンプレート（`API_design_structure_Cproject.md` / `API_design_structure_Cproject_implementA.md`）を統合し、本プロジェクト向けの共通テンプレート `API_design_structure_project.md` を作成
   - 骨組み（8セクション構成）をベースに、データモデル・エラーレスポンス統一形式・処理フロー・curl例を肉付け
2. `api_design_workflow.md` で対象4本のチェックリストを作成
3. 実装ファイル（controller・service・dto・schema）を読み込み、実態に沿った内容で各設計書を作成
4. 全4本完成後、チェックリストを更新してコミット

### ポイント

- エンドポイントの担当レイヤー（BFF / NestJS）を設計書ごとに明示
- 動作確認のcurlコマンドを各設計書に記載し、再現性を確保
- `mock/trigger-job` は開発専用APIであることを設計書に明記（本番公開禁止）