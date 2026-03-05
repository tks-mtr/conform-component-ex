# プロジェクトルール

## コミットルール

### 形式
Conventional Commits を使用する。

```
<type>: <説明>

type一覧:
  feat     新機能の追加
  fix      バグ修正
  docs     ドキュメントのみの変更
  refactor リファクタリング（機能追加・バグ修正なし）
  test     テストの追加・修正
  chore    ビルド・設定・依存関係の変更
```

例:
```
feat: BFF用redisクライアントを追加
docs: Redis PubSub要件書にバックエンド仕様を追記
chore: backend/node_modulesをgitignoreに追加
```

### 粒度
`docs/features/*/workflow.md` のチェックリスト項目1つ = コミット1つ。

### 禁止事項
- `node_modules/` をコミットしない
- 複数のPhaseをまとめて1コミットにしない

## コードドキュメント規約

関数・メソッドにはJSDocコメントを記述すること。

```ts
/**
 * 関数の目的・概要を記述する。
 * 必要に応じて呼び出しタイミングや背景も補足する。
 *
 * @param paramName - パラメータの説明
 * @returns 戻り値の説明（void の場合は省略可）
 * @throws エラークラス名 スローされる条件
 */
```

### 対象
- `Service` クラスの全メソッド
- `Controller` のエンドポイントハンドラ
- ビジネスロジックを含むユーティリティ関数・カスタムフック

### 省略してよいケース
- ロジックが自明な単純なgetter/setter

---

## テスト方針

### フレームワーク
| レイヤー | ツール |
|---------|--------|
| BFF/フロントエンド（app/） | Vitest + React Testing Library |
| バックエンド（backend/） | Jest + @nestjs/testing |

### タイミング
各Phaseの実装コミット直後に、対応するUTをコミットする（実装とテストを同一Phaseで完結させる）。

```
feat: notifications.serviceを実装
test: notifications.serviceのユニットテストを追加  ← 実装の直後
```

### カバレッジ基準
- ステートメントカバレッジ: **80%以上**
- ビジネスロジックを持つ Service クラス: **90%以上**
- 正常系・異常系（エラーハンドリング）の両方をテストすること

### モック方針
- UT（Phase 2〜4）: Redis・DB・fetchはすべてモック化する
- 結合テスト（Phase 5）: Docker ComposeでRedis・DBを実際に起動して全フローを検証する
- NestJS の Service テストは `@nestjs/testing` の `TestingModule` を使用する

### テストファイルの配置
- BFF: `app/**/*.test.ts` / `app/**/*.test.tsx`
- backend: `backend/src/**/*.spec.ts`（NestJS規約に従う）
