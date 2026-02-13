# サーバーサイドPDF生成（動的フォントサブセット化） 汎用シーケンス

このドキュメントは、`pdf-lib` と `subset-font` を用いた、日本語対応かつ軽量なPDF生成機能の処理フローを抽象化したものです。
特定の業務データ（ユーザーリスト等）に依存しないため、他の帳票出力機能などにも応用可能です。

```mermaid
sequenceDiagram
    autonumber
    
    actor User as ユーザー
    participant Browser as ブラウザ
    participant Server as Webサーバー<br>(Resource Route)
    participant Logic as PDF生成ロジック<br>(Utility)
    participant FontLib as フォント処理<br>(subset-font)
    participant PDFLib as PDF生成<br>(pdf-lib)

    %% 1. リクエスト
    User->>Browser: PDF出力ボタン押下
    Browser->>Server: GET /resources/pdf-export?params=...<br>(検索条件等を送信)

    %% 2. データ取得・加工
    activate Server
    Server->>Server: パラメータ解析 & データ取得<br>(DB検索など)
    note right of Server: 入力情報 (Abstract Input)<br>- 表示対象データ配列<br>- レイアウト設定<br>- 固定文言

    %% 3. フォント準備（インメモリキャッシュ）
    Server->>Server: フォントファイル読み込み<br>(初回のみファイルシステムから)
    note right of Server: キャッシュ済みバッファがあれば再利用

    %% 4. 動的サブセット化 (On-the-fly Subsetting)
    rect rgb(240, 248, 255)
        note right of Server: **パフォーマンス最適化ポイント**
        Server->>Server: 出力テキスト抽出
        note right of Server: データ内の全日本語文字を連結<br>例: "氏名部署..."
        
        Server->>FontLib: フルセットフォント + 抽出テキスト
        activate FontLib
        FontLib-->>Server: サブセットフォント(軽量バイナリ)
        deactivate FontLib
        note right of Server: 必要な文字だけを含む<br>超軽量フォントが完成
    end

    %% 5. PDF生成
    Server->>Logic: データ + サブセットフォント
    activate Logic
    Logic->>PDFLib: ドキュメント作成 & フォント埋め込み
    
    loop データ行数分
        Logic->>PDFLib: テキスト・図形描画
    end
    
    Logic-->>Server: PDFバイナリデータ
    deactivate Logic

    %% 6. レスポンス
    Server-->>Browser: HTTP 200 OK<br>Content-Type: application/pdf
    deactivate Server

    %% 7. ユーザーアクション
    Browser-->>User: ファイルダウンロード開始
```

## 処理のポイント

1.  **入力情報の抽象化**:
    - 特定のテーブル構造に依存せず、「表示したいテキスト」さえ抽出できれば、どのようなデータでも適用可能です。
2.  **動的サブセット化 (On-the-fly)**:
    - 事前にフォントセットを定義するのではなく、**「その時出力する文字」** だけを都度抽出してフォントを生成します。
    - これにより、人名や特殊な記号が含まれていても文字化けせず、かつファイルサイズを最小限（数KB〜数十KB）に抑えられます。
3.  **インメモリキャッシュ**:
    - 元となる巨大なフォントファイル（フルセット）は、サーバー起動後1回だけ読み込み、メモリに常駐させることでディスクI/Oを削減します。
