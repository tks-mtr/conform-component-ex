# ユーザー一覧 PDF出力機能 実装計画

## Goal Description
ユーザー一覧画面 (`/users`) のPDF出力機能において、日本語フォントの取り扱いを最適化します。
メンテナンス性を高めるため、事前に文字リストをハードコードしてサブセットを作るのではなく、**PDF生成時に出力内容に基づいて動的にサブセットフォントを生成する**方式に変更します。

## User Review Required
- **動的サブセット化 (On-the-fly Subsetting)**:
    - **メリット**: 新しい漢字（人名や部署名）が増えても、コード修正やスクリプト再実行が一切不要。常に必要最小限のフォントサイズになり、PDFも軽量化される。
    - **パフォーマンス**: リクエストのたびにフォント生成処理が走るが、`subset-font` は高速（Wasmベース）なため、数秒以内に収まると予想される。

## Proposed Changes

### Dependencies
- `npm install subset-font` (済み)

### Utilities

#### [MODIFY] [resources.user-list-pdf.ts](file:///Users/tks_mtr/work/conform_compornent_ex/app/routes/resources.user-list-pdf.ts)
- **変更前**: 静的に作成された `noto-sans-jp-subset.woff` を読み込んで使用。
- **変更後**:
    1. フルセットの `noto-sans-jp.woff` を読み込む（インメモリキャッシュ）。
    2. PDF出力対象のユーザーデータから、使用されている全文字（氏名、部署名）を抽出・重複排除。
    3. `subset-font` ライブラリを使用して、メモリ上で軽量なサブセットフォントを生成。
    4. 生成したフォントを `generateUserListPdf` に渡す。

#### [DELETE] [scripts/create-subset.mjs](file:///Users/tks_mtr/work/conform_compornent_ex/scripts/create-subset.mjs)
- 不要になるため削除、またはアーカイブ。

### Verification Plan
1.  **動作確認**:
    - 特殊な漢字や記号を含むデータをモックに追加しても、正しくPDFに表示されることを確認。
    - ハードコードされたリストに依存していないことを証明する。
2.  **パフォーマンス確認**:
    - 動的生成を入れても、UXを損なうほどの遅延（数秒以上）が発生しないことを確認。
