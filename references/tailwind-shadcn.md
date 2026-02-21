# Tailwind CSS v4 + shadcn/ui

> **重要**: Tailwind CSS v4 は v3 と多くの破壊的変更があります。
> v3 の記法を v4 環境で使わないよう、このファイルを必ず確認してください。

## Tailwind CSS v4 の主要変更点

### 1. 設定ファイルの廃止

```
❌ v3: tailwind.config.ts が必要
✅ v4: CSS ファイルに直接記述
```

```typescript
// ❌ v3 (使わない)
// tailwind.config.ts
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6",
      },
    },
  },
};
```

### 2. CSS でのインポートと設定

```css
/* ✅ v4: globals.css または index.css */
@import "tailwindcss";

/* カスタムテーマは @theme ブロックで定義 */
@theme {
  --color-primary: #3b82f6;
  --color-primary-foreground: #ffffff;
  --color-secondary: #f1f5f9;
  --color-background: #ffffff;
  --color-foreground: #020817;
  --color-border: #e2e8f0;

  --font-sans: "Inter", sans-serif;
  --font-mono: "Fira Code", monospace;

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
}
```

### 3. `@apply` の廃止推奨

```css
/* ❌ v3: @apply は使わない */
.btn {
  @apply px-4 py-2 bg-primary text-white rounded-md;
}

/* ✅ v4: クラスを直接 HTML に記述 */
```

```tsx
/* ✅ v4: JSX でクラスを直接指定 */
<button className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
  Click me
</button>
```

### 4. JIT がデフォルトで組み込み (設定不要)

v4 では JIT (Just-In-Time) コンパイルがデフォルトで有効。設定不要。

### 5. CSS 変数ベースのカラーシステム

```css
/* ✅ v4: CSS 変数で色を管理 */
@theme {
  --color-primary: oklch(0.5 0.2 250);
  --color-primary-dark: oklch(0.4 0.2 250);
}

/* ダークモード */
@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: oklch(0.1 0 0);
    --color-foreground: oklch(0.9 0 0);
  }
}
```

---

## Next.js での Tailwind v4 セットアップ

```bash
pnpm add tailwindcss @tailwindcss/postcss
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* shadcn/ui との統合のための CSS 変数 */
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222.2 84% 4.9%);
  --color-primary: hsl(221.2 83.2% 53.3%);
  --color-primary-foreground: hsl(210 40% 98%);
  --color-secondary: hsl(210 40% 96.1%);
  --color-secondary-foreground: hsl(222.2 47.4% 11.2%);
  --color-muted: hsl(210 40% 96.1%);
  --color-muted-foreground: hsl(215.4 16.3% 46.9%);
  --color-accent: hsl(210 40% 96.1%);
  --color-accent-foreground: hsl(222.2 47.4% 11.2%);
  --color-destructive: hsl(0 72.22% 50.59%);
  --color-border: hsl(214.3 31.8% 91.4%);
  --color-input: hsl(214.3 31.8% 91.4%);
  --color-ring: hsl(221.2 83.2% 53.3%);
  --radius: 0.5rem;
}

@layer base {
  * {
    border-color: var(--color-border);
  }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}
```

---

## Vite での Tailwind v4 セットアップ

```bash
pnpm add tailwindcss @tailwindcss/vite
```

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* src/index.css */
@import "tailwindcss";
/* 以降は Next.js と同様の @theme 設定 */
```

---

## shadcn/ui の追加

### 初期化

```bash
# shadcn/ui の初期化 (Tailwind v4 対応の最新版を使用)
pnpm dlx shadcn@latest init
```

```
? Which style would you like to use? › Default
? Which color would you like to use as the base color? › Slate
? Would you like to use CSS variables for theming? › Yes
```

### コンポーネントの追加

```bash
# 個別追加
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add form
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add toast

# よく使うセット
pnpm dlx shadcn@latest add button input label form card dialog sheet toast
```

### components.json

```json
// components.json (shadcn が生成)
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## `cn()` ユーティリティパターン

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// 使用例: 条件付きクラス
<div
  className={cn(
    "base-class another-class",
    isActive && "active-class",
    variant === "primary" && "text-primary bg-primary/10",
    className, // 外部からの上書き
  )}
/>
```

---

## cva でのバリアント管理

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // 共通クラス
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = ({ className, variant, size, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};
```

---

## ダークモード対応

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* ライトモード (デフォルト) */
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222.2 84% 4.9%);
}

/* ダークモード (class ベース) */
.dark {
  --color-background: hsl(222.2 84% 4.9%);
  --color-foreground: hsl(210 40% 98%);
}
```

```tsx
// 'use client'
// テーマ切り替え (next-themes を使用)
import { useTheme } from "next-themes";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle theme
    </button>
  );
};
```

---

## よく使う Tailwind パターン

```tsx
// レイアウト
<div className="container mx-auto px-4">
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// テキスト
<h1 className="text-4xl font-bold tracking-tight">
<p className="text-muted-foreground text-sm">

// インタラクション
<button className="transition-colors hover:bg-accent active:scale-95">

// フォーカス
<input className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

// レスポンシブ
<div className="hidden md:block">
<div className="flex flex-col sm:flex-row">
```
