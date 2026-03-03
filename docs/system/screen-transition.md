# 画面遷移図

## 画面一覧

| 画面名 | URL | ファイル |
|--------|-----|---------|
| TOP（メニュー） | `/` | `app/routes/home.tsx` |
| アサイン登録 | `/assign` | `app/routes/assign.tsx` |
| 登録完了 | `/register-complete` | `app/routes/register-complete.tsx` |
| ユーザー一覧 | `/users` | `app/routes/user-list.tsx` |

## API・リソースルート

| 種別 | URL | ファイル | 説明 |
|------|-----|---------|------|
| API | `/api/department` | `app/routes/api.department.ts` | 部署追加 |
| Resource Route | `/resources/user-list-pdf` | `app/routes/resources.user-list-pdf.ts` | PDFダウンロード |

## 遷移図

```mermaid
flowchart TD
    TOP["TOP（メニュー）<br/>/"]
    ASSIGN["アサイン登録<br/>/assign"]
    COMPLETE["登録完了<br/>/register-complete"]
    USERS["ユーザー一覧<br/>/users"]

    MODAL["モーダル<br/>（部署追加）"]
    PDF["PDFダウンロード<br/>/resources/user-list-pdf"]
    API_DEPT["/api/department<br/>POST"]

    TOP -->|"アサイン登録"| ASSIGN
    TOP -->|"ユーザー一覧"| USERS

    ASSIGN -->|"登録ボタン（フォーム送信成功）"| COMPLETE
    ASSIGN -->|"所属を追加ボタン"| MODAL
    MODAL -->|"保存（POST）"| API_DEPT
    API_DEPT -->|"成功 → モーダルを閉じる"| ASSIGN

    COMPLETE -->|"続けて登録する"| ASSIGN
    COMPLETE -->|"TOPへ戻る"| TOP
    COMPLETE -->|"パラメータ不正 → エラー表示"| TOP

    USERS -->|"新規登録ボタン"| ASSIGN
    USERS -->|"PDF出力"| PDF

    PDF -->|"PDFファイルをレスポンス"| USERS
```

## 補足

- ユーザー一覧（`/users`）は `departmentId` / `employeeId` のクエリパラメータでフィルタリング可能
- PDF出力は現在のフィルタ条件をそのまま引き継ぐ
- 部署追加は `fetcher` を使ったバックグラウンド送信（画面遷移なし）
- ユーザー一覧の「条件クリア」はGETパラメータを削除して同画面を再表示（自己遷移）
```
