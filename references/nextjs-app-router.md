# Next.js App Router パターン

## ディレクトリ構成

```
my-app/
├── app/
│   ├── layout.tsx          # Root Layout (必須)
│   ├── page.tsx            # ホームページ
│   ├── globals.css         # グローバルCSS (Tailwind v4)
│   ├── (auth)/             # Route Group (URL に影響しない)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── loading.tsx     # Suspense fallback
│   └── api/
│       └── route.ts        # Route Handler
├── components/
│   ├── ui/                 # shadcn/ui コンポーネント
│   └── features/           # 機能別コンポーネント
├── lib/
│   ├── utils.ts            # cn() など共通ユーティリティ
│   └── api/                # API クライアント
├── public/
├── biome.json
├── package.json
└── tsconfig.json
```

## Server Component vs Client Component の判断基準

### Server Component を使う場合 (デフォルト)
- データを fetch する
- バックエンドリソース（DB、FS、API）に直接アクセスする
- 機密情報（API キー、トークン）を扱う
- 大きな依存ライブラリを使う（バンドルサイズ削減）
- SEO が必要なコンテンツを表示する

```tsx
// app/posts/page.tsx - Server Component (デフォルト)
async function PostsPage() {
  const posts = await fetch("https://api.example.com/posts").then((r) =>
    r.json()
  );
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
export default PostsPage;
```

### Client Component を使う場合 (`'use client'` が必要)
- `useState`, `useReducer`, `useEffect` などのフックを使う
- イベントハンドラ（onClick, onChange 等）を使う
- ブラウザ専用 API（localStorage, window 等）を使う
- カスタムフックを使う

```tsx
// components/counter.tsx - Client Component
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

### コンポーザブルパターン: Server + Client の組み合わせ

```tsx
// app/dashboard/page.tsx (Server Component)
import { Suspense } from "react";
import { UserProfile } from "@/components/user-profile"; // Client Component
import { PostList } from "@/components/post-list";       // Server Component

export default function DashboardPage() {
  return (
    <div>
      <UserProfile /> {/* インタラクティブ */}
      <Suspense fallback={<div>Loading posts...</div>}>
        <PostList />  {/* データ取得 */}
      </Suspense>
    </div>
  );
}
```

## render-as-you-fetch パターン

> 詳細は [data-fetching.md](data-fetching.md) を参照

### 基本パターン: Server Component での直接 fetch

```tsx
// app/users/[id]/page.tsx
import { Suspense } from "react";
import { UserCard } from "@/components/user-card";
import { UserPosts } from "@/components/user-posts";

// データ取得を Promise として定義
async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    next: { revalidate: 60 }, // ISR: 60秒でキャッシュ更新
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

async function getUserPosts(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}/posts`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export default function UserPage({ params }: { params: { id: string } }) {
  // Promise を作成してコンポーネントに渡す (render-as-you-fetch)
  const userPromise = getUser(params.id);
  const postsPromise = getUserPosts(params.id);

  return (
    <div>
      <Suspense fallback={<div>Loading user...</div>}>
        <UserCard userPromise={userPromise} />
      </Suspense>
      <Suspense fallback={<div>Loading posts...</div>}>
        <UserPosts postsPromise={postsPromise} />
      </Suspense>
    </div>
  );
}
```

```tsx
// components/user-card.tsx (Server Component)
import { use } from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

export function UserCard({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Suspense で待機
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Streaming with loading.tsx

```tsx
// app/dashboard/loading.tsx - 自動的に Suspense boundary になる
export default function Loading() {
  return <div className="animate-pulse">Loading dashboard...</div>;
}
```

## Route Handler

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get("page") ?? "1";

  const data = await fetch(`https://api.example.com/users?page=${page}`);
  const users = await data.json();

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // バリデーション
  // ...

  return NextResponse.json({ success: true }, { status: 201 });
}
```

## Metadata API

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

// 動的 Metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetch(`https://api.example.com/posts/${params.slug}`).then(
    (r) => r.json()
  );

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default function BlogPost({ params }: Props) {
  return <article>{/* ... */}</article>;
}
```

## エラーハンドリング

```tsx
// app/dashboard/error.tsx (Client Component)
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

## fetch のキャッシュ制御

```typescript
// キャッシュなし (毎回取得)
fetch(url, { cache: "no-store" });

// ISR (Incremental Static Regeneration)
fetch(url, { next: { revalidate: 60 } }); // 60秒

// 静的 (ビルド時のみ)
fetch(url, { cache: "force-cache" }); // デフォルト

// タグベースの再バリデーション
fetch(url, { next: { tags: ["posts"] } });
// その後: revalidateTag("posts") で無効化
```
