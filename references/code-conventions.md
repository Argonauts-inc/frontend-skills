# コーディング規約

## TypeScript

### strict モード必須

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true
  }
}
```

### 型定義のルール

```typescript
// ✅ 明示的な型定義
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ✅ unknown + type guard
function processData(data: unknown): string {
  if (typeof data === "string") return data;
  throw new Error("Expected string");
}

// ❌ any は禁止
function processData(data: any): string { ... }

// ✅ as const でリテラル型
const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
} as const;

type Route = (typeof ROUTES)[keyof typeof ROUTES];

// ✅ satisfies で型チェックしつつ推論を保持
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
} satisfies Record<string, string | number>;
```

---

## コンポーネント

### 関数コンポーネント + アロー関数

```tsx
// ✅ アロー関数 + 型注釈
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button = ({ label, onClick, disabled = false }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-primary text-primary-foreground"
    >
      {label}
    </button>
  );
};

// ❌ function 宣言は使わない (export default との一貫性のため)
export function Button({ label, onClick }: ButtonProps) { ... }
```

### `export default` vs `export const`

```tsx
// ✅ Pages/Layouts は export default (Next.js の規約)
// app/page.tsx
export default function HomePage() {
  return <h1>Home</h1>;
}

// ✅ コンポーネント・ユーティリティは named export
// components/button.tsx
export const Button = ({ ... }: ButtonProps) => { ... };

// ✅ フックは named export
// hooks/use-user.ts
export const useUser = (id: string) => { ... };

// ❌ コンポーネントへの export default は避ける (import 時の名前が変わる)
// components/button.tsx
export default function Button() { ... } // NG
```

---

## ファイル命名規則

```
コンポーネントファイル: kebab-case
  components/user-profile.tsx ✅
  components/UserProfile.tsx  ❌

コンポーネント名: PascalCase
  export const UserProfile = () => { ... } ✅

フック: camelCase, "use" プレフィックス
  hooks/use-auth.ts ✅
  export const useAuth = () => { ... } ✅

ユーティリティ: camelCase
  lib/format-date.ts ✅

型定義: PascalCase (interface/type)
  interface UserProfile { ... } ✅
  type ApiResponse<T> = { ... } ✅

定数: SCREAMING_SNAKE_CASE
  const API_BASE_URL = "..." ✅
  const MAX_RETRY_COUNT = 3 ✅
```

---

## `cn()` ユーティリティ

Tailwind クラスの条件付き結合と重複解決に使用する:

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// 使用例
import { cn } from "@/lib/utils";

interface CardProps {
  className?: string;
  highlighted?: boolean;
}

export const Card = ({ className, highlighted }: CardProps) => {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 shadow-sm",
        highlighted && "border-primary bg-primary/5",
        className, // 外部からのクラスで上書き可能
      )}
    >
      {/* ... */}
    </div>
  );
};
```

---

## カスタムフック

### 命名と責務分離

```typescript
// hooks/use-user.ts - 1つのフックは1つの責務
export const useUser = (userId: string) => {
  const { data, error, isLoading } = useSWR<User>(`/api/users/${userId}`, fetcher);

  return {
    user: data,
    error,
    isLoading,
    // 派生状態を計算して返す
    isAdmin: data?.role === "admin",
  };
};

// hooks/use-user-form.ts - フォームロジック専用フック
export const useUserForm = (userId?: string) => {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (values: UserFormValues) => {
    if (userId) {
      await updateUser(userId, values);
    } else {
      await createUser(values);
    }
  };

  return { form, onSubmit };
};
```

---

## `'use client'` を付けるべき条件

```tsx
// ✅ 'use client' が必要なケース:
// 1. React フックを使う
"use client";
import { useState, useEffect } from "react";

// 2. ブラウザ API を使う
"use client";
const theme = localStorage.getItem("theme");

// 3. イベントハンドラを定義する
"use client";
<button onClick={() => console.log("clicked")}>

// 4. クライアントサイドのみのライブラリを使う
"use client";
import { Chart } from "some-chart-library"; // window に依存

// ❌ 'use client' が不要なケース:
// データ取得 → Server Component で直接 fetch
// 表示専用コンポーネント → Server Component のまま
// props を受け取るだけのコンポーネント → Server Component のまま
```

---

## Linting / Formatting

### Biome (デフォルト)

```json
// biome.json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "**",
      "!**/bun.lock",
      "!**/.next",
      "!**/dist",
      "!**/node_modules",
      "!**/components/ui",
      "!**/src/gen"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "assist": { "actions": { "source": { "organizeImports": "off" } } },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noUnknownAtRules": "off"
      },
      "style": {
        "noUnusedTemplateLiteral": "off"
      },
      "performance": {
        "noImgElement": "off"
      },
      "complexity": {
        "noUselessFragments": "off"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double"
    }
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  }
}
```

```json
// package.json scripts
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write ."
  }
}
```

### oxlint + oxfmt (代替)

```bash
bun add -d oxlint oxfmt
```

```json
// package.json scripts
{
  "scripts": {
    "lint": "oxlint .",
    "format": "oxfmt --write ."
  }
}
```

---

## インポート順序

Biome が自動整理するが、手動の場合は以下の順序に従う:

```typescript
// 1. Node.js 組み込みモジュール
import path from "node:path";
import fs from "node:fs";

// 2. 外部パッケージ
import { Suspense } from "react";
import useSWR from "swr";

// 3. 内部モジュール (@/ エイリアス)
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/user";
```

---

## Props の型定義スタイル

```tsx
// ✅ Props は interface で定義 (拡張可能)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

// ✅ 小さなコンポーネントは inline でも可
export const Divider = ({ className }: { className?: string }) => (
  <hr className={cn("border-border", className)} />
);
```
