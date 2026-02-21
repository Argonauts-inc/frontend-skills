# frontend-skills

Argonauts Inc. のフロントエンド開発において、AI エージェントが一貫した技術選定・コードパターンでプロジェクトをゼロから組み上げられるようにするための Agent Skill です。

## インストール

```bash
npx skills add Argonauts-inc/frontend-skills
```

特定のエージェントに限定してインストールする場合:

```bash
# Claude Code のみ
npx skills add Argonauts-inc/frontend-skills -a claude-code

# 確認プロンプトをスキップ (CI/CD など)
npx skills add Argonauts-inc/frontend-skills -y
```

## 使い方

インストール後、Claude Code などのエージェントに対してフロントエンド実装を依頼するだけでスキルが自動的に適用されます。

```
新しい Next.js プロジェクトをゼロから作って
```

```
gRPC-connect を使ったデータ取得を実装して
```

```
shadcn/ui の Button と Form を使ったログイン画面を作って
```

スキル起動時にエージェントから以下の質問が届きます:

| # | 質問 | 選択肢 |
|---|------|--------|
| 1 | フレームワーク | Next.js App Router / React SPA (Vite) |
| 2 | API 通信方式 | SWR+fetch / gRPC-connect / OpenAPI+orval |
| 3 | 状態管理 | なし / Jotai / Zustand / 後で決める |
| 4 | Lint / Format | Biome (デフォルト) / oxlint+oxfmt |

## 技術スタック

| 項目 | 採用技術 |
|------|---------|
| Framework | Next.js (latest, App Router) / React SPA (Vite) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui |
| Data fetching | SWR + fetch / gRPC-connect / orval |
| Data fetch 戦略 | render-as-you-fetch |
| Forms | react-hook-form + zod |
| Linting | Biome |
| Testing | Vitest + @testing-library/react |

## ファイル構成

```
frontend-skills/
├── SKILL.md                     # エントリーポイント
├── references/
│   ├── nextjs-app-router.md     # App Router パターン・render-as-you-fetch
│   ├── react-spa.md             # Vite + TanStack Router パターン
│   ├── data-fetching.md         # SWR / gRPC-connect / orval の使い方
│   ├── npm-packages.md          # 推奨パッケージ一覧と採用理由
│   ├── code-conventions.md      # TypeScript・命名規則・Biome 設定
│   ├── tailwind-shadcn.md       # Tailwind v4 破壊的変更・shadcn/ui
│   ├── state-management.md      # 状態管理の選択ガイド
│   └── anti-patterns.md         # NG パターン集・チェックリスト
└── assets/
    ├── nextjs-template/         # Next.js App Router ボイラープレート
    └── react-spa-template/      # Vite + React + TanStack Router ボイラープレート
```

## スキルの更新

```bash
npx skills update
```

## 主要な方針

- **render-as-you-fetch 徹底**: `useEffect` + `fetch` の fetch-on-render は使用しない
- **Server Component 優先**: `'use client'` は必要な場合のみ付与 (Next.js)
- **Tailwind v4**: `tailwind.config.ts` は使わない。`@import "tailwindcss"` + `@theme` で設定
- **TypeScript strict**: `any` 型は使用しない
- **Biome**: ESLint / Prettier は使用しない
