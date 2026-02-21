# データ取得パターン

## 基本原則: render-as-you-fetch

**fetch-on-render は使用しない**。`useEffect` + `fetch` のパターンは waterfall を引き起こし、パフォーマンスを低下させる。

| 方式 | 説明 | 使用場面 |
|------|------|---------|
| render-as-you-fetch | レンダリング前にデータ取得を開始 | **常にこれを使う** |
| fetch-on-render | レンダリング後に `useEffect` でフェッチ | **NG** |
| fetch-then-render | データ取得完了後にレンダリング | 古いパターン、使わない |

---

## Next.js App Router: Server Component + Suspense

### パターン1: 単一データ取得

```tsx
// app/posts/[id]/page.tsx (Server Component)
async function getPost(id: string) {
  const res = await fetch(`https://api.example.com/posts/${id}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Post not found");
  return res.json() as Promise<Post>;
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  return <article><h1>{post.title}</h1></article>;
}
```

### パターン2: 並列データ取得 (Promise + use())

複数の独立したデータを並列取得することで waterfall を防ぐ:

```tsx
// app/dashboard/page.tsx (Server Component)
import { Suspense } from "react";
import { UserProfile } from "@/components/user-profile";
import { RecentPosts } from "@/components/recent-posts";
import { Stats } from "@/components/stats";

async function getUser(id: string) {
  return fetch(`/api/users/${id}`).then((r) => r.json());
}

async function getPosts(userId: string) {
  return fetch(`/api/users/${userId}/posts`).then((r) => r.json());
}

async function getStats() {
  return fetch("/api/stats").then((r) => r.json());
}

export default function DashboardPage() {
  // 並列で Promise を作成 (await しない！)
  const userPromise = getUser("me");
  const postsPromise = getPosts("me");
  const statsPromise = getStats();

  return (
    <div className="grid grid-cols-3 gap-4">
      <Suspense fallback={<Skeleton />}>
        <UserProfile userPromise={userPromise} />
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <RecentPosts postsPromise={postsPromise} />
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <Stats statsPromise={statsPromise} />
      </Suspense>
    </div>
  );
}
```

```tsx
// components/user-profile.tsx (Server Component)
import { use } from "react";

interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

export function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Suspense が解決を待つ
  return (
    <div>
      <img src={user.avatarUrl} alt={user.name} />
      <h2>{user.name}</h2>
    </div>
  );
}
```

### パターン3: Sequential (依存関係あり)

```tsx
// データに依存関係がある場合
async function getUserWithPosts(userId: string) {
  const user = await getUser(userId);
  const posts = await getPosts(user.id); // user が必要
  return { user, posts };
}
```

---

## SWR (クライアントサイド / SPA)

SWR はクライアントサイドのデータ取得に使用する。Server Component での fetch との使い分けに注意。

### 基本的な使い方

```typescript
// lib/api/fetcher.ts
export const fetcher = <T>(url: string): Promise<T> =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("An error occurred while fetching the data.");
    return res.json();
  });
```

```tsx
// components/user-list.tsx (Client Component)
"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api/fetcher";

interface User {
  id: string;
  name: string;
}

export function UserList() {
  const { data: users, error, isLoading } = useSWR<User[]>("/api/users", fetcher);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {users?.map((user) => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

### Suspense モード (推奨)

```tsx
// components/user-list.tsx - Suspense モード
"use client";

import useSWR from "swr";
import { Suspense } from "react";
import { fetcher } from "@/lib/api/fetcher";

function UserListContent() {
  // suspense: true で Suspense boundary が制御する
  const { data: users } = useSWR<User[]>("/api/users", fetcher, {
    suspense: true,
  });

  return (
    <ul>
      {users?.map((user) => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}

export function UserList() {
  return (
    <Suspense fallback={<div>Loading users...</div>}>
      <UserListContent />
    </Suspense>
  );
}
```

### ミューテーション

```tsx
"use client";

import useSWR, { useSWRConfig } from "swr";

export function UserActions({ userId }: { userId: string }) {
  const { mutate } = useSWRConfig();

  const deleteUser = async () => {
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    // キャッシュを無効化して再取得
    mutate("/api/users");
  };

  return <button onClick={deleteUser}>Delete</button>;
}
```

---

## gRPC-connect (@connectrpc/connect)

### セットアップ

```bash
bun add @connectrpc/connect @connectrpc/connect-web @bufbuild/protobuf
bun add -d @bufbuild/buf @connectrpc/protoc-gen-connect-es @bufbuild/protoc-gen-es
```

### クライアント設定

```typescript
// lib/api/connect.ts
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

const transport = createConnectTransport({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
});

export function createServiceClient<T extends object>(service: T) {
  return createClient(service, transport);
}
```

### 使用例

```typescript
// lib/api/user-service.ts
import { UserService } from "@/gen/user_connect"; // protoc で生成
import { createServiceClient } from "./connect";

export const userClient = createServiceClient(UserService);
```

```tsx
// components/user-detail.tsx (Server Component - Next.js)
import { userClient } from "@/lib/api/user-service";
import { GetUserRequest } from "@/gen/user_pb";

export async function UserDetail({ userId }: { userId: string }) {
  const response = await userClient.getUser(
    new GetUserRequest({ id: userId })
  );

  return (
    <div>
      <h1>{response.user?.name}</h1>
    </div>
  );
}
```

```tsx
// Client Component での使用 (SWR と組み合わせ)
"use client";

import useSWR from "swr";
import { userClient } from "@/lib/api/user-service";
import { GetUserRequest } from "@/gen/user_pb";

export function UserProfileClient({ userId }: { userId: string }) {
  const { data } = useSWR(
    ["user", userId],
    ([, id]) => userClient.getUser(new GetUserRequest({ id })),
    { suspense: true }
  );

  return <div>{data?.user?.name}</div>;
}
```

---

## orval (OpenAPI クライアント自動生成)

### セットアップ

```bash
bun add -d orval
```

```typescript
// orval.config.ts
import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "./openapi.yaml",
    output: {
      mode: "tags-split",
      target: "./src/gen/api",
      schemas: "./src/gen/model",
      client: "swr", // SWR フックを生成
      prettier: false, // biome を使うため false
    },
    hooks: {
      afterAllFilesWrite: "biome format --write ./src/gen",
    },
  },
});
```

```bash
# クライアント生成
bunx orval
```

### 生成されたフックの使用

```tsx
// orval が生成した SWR フックを使用
"use client";

import { useGetUsers, useCreateUser } from "@/gen/api/users";

export function UserList() {
  // orval が生成した型付きフック
  const { data: users, isLoading } = useGetUsers();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {users?.data.map((user) => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

---

## エラーハンドリングのベストプラクティス

```typescript
// lib/api/error.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.statusText, res.status, data);
  }
  return res.json();
};
```

```tsx
// Error boundary と組み合わせ
import { ErrorBoundary } from "react-error-boundary";

export function UserSection() {
  return (
    <ErrorBoundary
      fallback={<div>Failed to load users</div>}
      onError={(error) => console.error(error)}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <UserList />
      </Suspense>
    </ErrorBoundary>
  );
}
```
