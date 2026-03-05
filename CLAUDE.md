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
