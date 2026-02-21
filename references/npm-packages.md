# 推奨 npm パッケージ一覧

## パッケージマネージャー

**bun を使用する** (高速、Node.js 互換、ビルトインバンドラー):

```bash
# bun のインストール
curl -fsSL https://bun.sh/install | bash
# または
brew install bun
```

---

## コアパッケージ

| パッケージ | バージョン方針 | 採用理由 |
|-----------|-------------|---------|
| `next` | latest | App Router、RSC、Streaming SSR |
| `react` | latest (next に同期) | UI ライブラリ |
| `react-dom` | latest (next に同期) | DOM レンダリング |
| `typescript` | `^5.x` | 型安全性 |

```bash
# Next.js プロジェクト
bun create next-app@latest my-app --typescript --app --no-eslint
```

---

## スタイリング

| パッケージ | バージョン方針 | 採用理由 |
|-----------|-------------|---------|
| `tailwindcss` | `^4.x` | ユーティリティCSS (v4 必須) |
| `@tailwindcss/vite` | `^4.x` | Vite 向けプラグイン |
| `tailwind-merge` | latest | クラス名の重複を解決する |
| `clsx` | latest | 条件付きクラス名生成 |

```bash
bun add tailwindcss tailwind-merge clsx
# Next.js の場合
bun add @tailwindcss/postcss
# Vite の場合
bun add @tailwindcss/vite
```

> **注意**: Tailwind CSS v4 は v3 と破壊的変更あり。詳細は [tailwind-shadcn.md](tailwind-shadcn.md) を参照

---

## UI コンポーネント

| パッケージ | バージョン方針 | 採用理由 |
|-----------|-------------|---------|
| `shadcn/ui` | CLI 経由で追加 | アクセシブルなコンポーネント群 |
| `@radix-ui/*` | shadcn が自動管理 | shadcn/ui の依存関係 |
| `lucide-react` | latest | shadcn/ui 標準アイコン |
| `class-variance-authority` | latest | バリアント管理 (cva) |

```bash
# shadcn/ui 初期化
bunx shadcn@latest init

# コンポーネント追加
bunx shadcn@latest add button
bunx shadcn@latest add input form card dialog
```

---

## フォーム

| パッケージ | バージョン方針 | 採用理由 |
|-----------|-------------|---------|
| `react-hook-form` | `^7.x` | パフォーマンス重視のフォーム管理 |
| `zod` | `^3.x` | スキーマバリデーション・型推論 |
| `@hookform/resolvers` | latest | zod と react-hook-form の統合 |

```bash
bun add react-hook-form zod @hookform/resolvers
```

---

## データ取得

| パッケージ | バージョン方針 | 使用場面 |
|-----------|-------------|---------|
| `swr` | `^2.x` | クライアントサイドデータ取得 (デフォルト) |
| `@connectrpc/connect` | latest | gRPC-connect プロトコル |
| `@connectrpc/connect-web` | latest | ブラウザ向け gRPC transport |
| `@bufbuild/protobuf` | latest | Protocol Buffers ランタイム |

```bash
# SWR (デフォルト)
bun add swr

# gRPC-connect (必要な場合)
bun add @connectrpc/connect @connectrpc/connect-web @bufbuild/protobuf
bun add -d @bufbuild/buf @connectrpc/protoc-gen-connect-es @bufbuild/protoc-gen-es

# OpenAPI (必要な場合)
bun add -d orval
```

---

## 状態管理

| パッケージ | バージョン方針 | 使用場面 |
|-----------|-------------|---------|
| `jotai` | `^2.x` | 軽量グローバル状態 (推奨) |
| `zustand` | `^5.x` | 複雑なグローバル状態 |

```bash
# 軽量な場合
bun add jotai

# 複雑な場合
bun add zustand
```

> 選択ガイドは [state-management.md](state-management.md) を参照

---

## ユーティリティ

| パッケージ | バージョン方針 | 採用理由 |
|-----------|-------------|---------|
| `date-fns` | `^4.x` | 日付操作 (モジュラー設計でバンドルサイズ最小) |

```bash
bun add date-fns
```

> `dayjs` も選択肢だが、`date-fns` を優先する (TypeScript サポートが優れている)

---

## Linting / Formatting

| パッケージ | バージョン方針 | 採用理由 |
|-----------|-------------|---------|
| `@biomejs/biome` | `^1.x` | 高速、設定シンプル (デフォルト) |

```bash
# Biome のインストールと初期化
bun add -d @biomejs/biome
bunx biome init
```

> **ESLint / Prettier は使用しない**。Biome に統一する。
> oxlint + oxfmt を使う場合は別途インストール。

---

## テスト

| パッケージ | バージョン方針 | 採用理由 |
|-----------|-------------|---------|
| `vitest` | `^2.x` | Vite ベースの高速テストランナー |
| `@testing-library/react` | latest | コンポーネントテスト |
| `@testing-library/user-event` | latest | ユーザー操作シミュレーション |
| `@vitejs/plugin-react` | latest | Vitest 向け React サポート |
| `jsdom` | latest | ブラウザ環境シミュレーション |

```bash
bun add -d vitest @testing-library/react @testing-library/user-event @vitejs/plugin-react jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

---

## パッケージバージョン管理方針

- **latest 指定は避ける**: `^` (互換バージョン) で指定
- **lockfile をコミット**: `bun.lock` は必ずコミットする
- **定期的な更新**: `bun update` で依存関係を確認
- **peer dependencies**: shadcn/ui の依存関係は自動管理に任せる

```bash
# 依存関係の更新確認
bun update

# セキュリティ監査
bun pm audit
```

---

## 使用しないパッケージ

| パッケージ | 代替 | 理由 |
|-----------|------|-----|
| `eslint` | Biome | Biome に統一 |
| `prettier` | Biome | Biome に統一 |
| `axios` | `fetch` + SWR | ブラウザ標準 fetch で十分 |
| `moment` | `date-fns` | バンドルサイズが大きい |
| `lodash` | ネイティブ JS | モダン JS で代替可能 |
| `styled-components` | Tailwind CSS | Tailwind に統一 |
| `emotion` | Tailwind CSS | Tailwind に統一 |
