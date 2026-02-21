# React SPA (Vite) パターン

## プロジェクト初期化

```bash
# Vite + React + TypeScript
pnpm create vite@latest my-app -- --template react-ts
cd my-app
pnpm install

# Tailwind CSS v4
pnpm add tailwindcss @tailwindcss/vite

# shadcn/ui のセットアップ
pnpm dlx shadcn@latest init
```

## ディレクトリ構成

```
my-app/
├── src/
│   ├── main.tsx              # エントリーポイント
│   ├── App.tsx               # ルートコンポーネント / ルーティング
│   ├── index.css             # グローバルCSS (Tailwind v4)
│   ├── components/
│   │   ├── ui/               # shadcn/ui コンポーネント
│   │   └── features/         # 機能別コンポーネント
│   ├── pages/                # ページコンポーネント (ルートに対応)
│   │   ├── home.tsx
│   │   └── dashboard.tsx
│   ├── hooks/                # カスタムフック
│   │   └── use-users.ts
│   ├── lib/
│   │   ├── utils.ts          # cn() など共通ユーティリティ
│   │   └── api/              # API クライアント
│   └── store/                # 状態管理 (Jotai/Zustand)
├── public/
├── biome.json
├── vite.config.ts
├── package.json
└── tsconfig.json
```

## vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

## ルーティング (TanStack Router 推奨)

TanStack Router は型安全なルーティングを提供し、SPA に最適:

```bash
pnpm add @tanstack/react-router
pnpm add -D @tanstack/router-plugin @tanstack/router-devtools
```

```typescript
// vite.config.ts に追加
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
});
```

```typescript
// src/routes/__root.tsx
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
      </nav>
      <Outlet />
    </div>
  ),
});
```

```typescript
// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <h1>Home</h1>;
}
```

```typescript
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen"; // 自動生成

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

### React Router v6 (代替)

```bash
pnpm add react-router-dom
```

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/home";
import { DashboardPage } from "@/pages/dashboard";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## SPA でのデータ取得パターン

SPA では Server Component が使えないため、SWR を使った render-as-you-fetch パターンを採用:

```tsx
// hooks/use-users.ts
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useUsers() {
  const { data, error, isLoading } = useSWR("/api/users", fetcher);
  return { users: data, error, isLoading };
}
```

```tsx
// pages/users.tsx - Suspense + SWR
import { Suspense } from "react";
import useSWR from "swr";

// SWR の Suspense モードを有効にする
const fetcher = (url: string) => fetch(url).then((r) => r.json());

function UserList() {
  const { data: users } = useSWR("/api/users", fetcher, { suspense: true });
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

export function UsersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserList />
    </Suspense>
  );
}
```

> SWR の詳細な使い方は [data-fetching.md](data-fetching.md) を参照

## SWR Provider の設定

```tsx
// src/main.tsx
import { SWRConfig } from "swr";

const swrConfig = {
  fetcher: (url: string) => fetch(url).then((r) => r.json()),
  revalidateOnFocus: false,
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SWRConfig value={swrConfig}>
      <RouterProvider router={router} />
    </SWRConfig>
  </StrictMode>
);
```

## 環境変数

```bash
# .env
VITE_API_URL=https://api.example.com
VITE_APP_NAME=My App
```

```typescript
// TypeScript での型付け
// src/vite-env.d.ts に追加
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

```typescript
// 使用方法
const apiUrl = import.meta.env.VITE_API_URL;
```
