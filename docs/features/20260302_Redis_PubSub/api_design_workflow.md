# API設計書 作成計画

> 対象機能: Redis PubSub リアルタイム通知
> 作成日: 2026-03-06
> テンプレート: `API_design_structure_project.md`

---

## 対象API一覧（全4本）

| # | エンドポイント | メソッド | 担当レイヤー | 設計書ファイル |
|---|--------------|---------|------------|--------------|
| 1 | `/api/sse/notifications` | GET | BFF（React Router v7） | `api/sse_notifications.md` |
| 2 | `/notifications/pending` | GET | NestJS | `api/notifications_pending.md` |
| 3 | `/notifications/:jobId/read` | POST | NestJS | `api/notifications_read.md` |
| 4 | `/mock/trigger-job` | POST | NestJS | `api/mock_trigger_job.md` |

---

## 作成チェックリスト

- [x] `API_design/sse_notifications.md` の作成（GET /api/sse/notifications）
- [x] `API_design/notifications_pending.md` の作成（GET /notifications/pending）
- [x] `API_design/notifications_read.md` の作成（POST /notifications/:jobId/read）
- [x] `API_design/mock_trigger_job.md` の作成（POST /mock/trigger-job）