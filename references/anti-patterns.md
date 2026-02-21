# アンチパターン集 (NG 集)

実装前・コードレビュー時に必ず確認してください。

---

## ❌ 1. `useEffect` + `fetch` による fetch-on-render

最も一般的なアンチパターン。waterfall とちらつきを引き起こす。

```tsx
// ❌ NG: fetch-on-render
"use client";

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // レンダリング後にフェッチが始まる (遅い!)
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

```tsx
// ✅ OK: SWR (クライアント) または Server Component

// パターン1: SWR
"use client";
import useSWR from "swr";

export function UserList() {
  const { data: users, isLoading } = useSWR<User[]>("/api/users", fetcher, {
    suspense: true,
  });
  return <ul>{users?.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

// パターン2: Server Component (Next.js)
export async function UserList() {
  const users = await fetch("/api/users").then(r => r.json());
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

---

## ❌ 2. `any` 型の使用

型安全性を破壊する。

```typescript
// ❌ NG
function processResponse(data: any) {
  return data.user.name; // 実行時エラーの原因
}

// ✅ OK: unknown + type guard
function processResponse(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "user" in data &&
    typeof (data as { user: unknown }).user === "object"
  ) {
    // 安全にアクセス
  }
}

// ✅ OK: zod でバリデーション
import { z } from "zod";

const responseSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

function processResponse(data: unknown) {
  const parsed = responseSchema.parse(data); // バリデーション + 型推論
  return parsed.user.name; // 型安全
}
```

---

## ❌ 3. Client Component の過剰使用

`'use client'` を不必要につけると Server Component の恩恵（バンドルサイズ削減、SEO、パフォーマンス）を失う。

```tsx
// ❌ NG: 全部 Client Component にする
"use client"; // 不要！

// ただデータを表示するだけで、インタラクションなし
export function UserCard({ user }: { user: User }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

```tsx
// ✅ OK: インタラクションがないなら Server Component のまま
// (↑ "use client" を削除するだけでよい)
export function UserCard({ user }: { user: User }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// Client Component が必要な部分だけ分離
"use client";
export function LikeButton({ userId }: { userId: string }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>...</button>;
}
```

---

## ❌ 4. `useEffect` での副作用の過剰依存

`useEffect` は同期が難しく、バグの温床になりやすい。

```tsx
// ❌ NG: useEffect で派生状態を計算
const [users, setUsers] = useState<User[]>([]);
const [adminUsers, setAdminUsers] = useState<User[]>([]);

useEffect(() => {
  setAdminUsers(users.filter(u => u.role === "admin")); // 不要な副作用
}, [users]);
```

```tsx
// ✅ OK: レンダリング中に直接計算
const [users, setUsers] = useState<User[]>([]);
const adminUsers = users.filter(u => u.role === "admin"); // シンプル
```

```tsx
// ❌ NG: useEffect での初期化
const [data, setData] = useState(null);
useEffect(() => {
  const stored = localStorage.getItem("data");
  if (stored) setData(JSON.parse(stored));
}, []);

// ✅ OK: 遅延初期化関数
const [data, setData] = useState(() => {
  const stored = localStorage.getItem("data");
  return stored ? JSON.parse(stored) : null;
});
```

---

## ❌ 5. 巨大なモノリシックコンポーネント

1ファイルに全ての責務を詰め込むとテスト・メンテナンスが困難になる。

```tsx
// ❌ NG: 200行以上の巨大コンポーネント
export function Dashboard() {
  // データ取得
  // フォーム管理
  // モーダル制御
  // グラフ描画
  // テーブル表示
  // ...全部ここに書く
}
```

```tsx
// ✅ OK: 責務ごとに分割
// components/dashboard/stats-section.tsx
export const StatsSection = ({ stats }: { stats: Stats }) => { ... };

// components/dashboard/user-table.tsx
export const UserTable = ({ usersPromise }: { usersPromise: Promise<User[]> }) => { ... };

// components/dashboard/activity-chart.tsx
export const ActivityChart = ({ data }: { data: ChartData }) => { ... };

// app/dashboard/page.tsx (Server Component)
export default function DashboardPage() {
  const statsPromise = getStats();
  const usersPromise = getUsers();

  return (
    <div>
      <Suspense fallback={<Skeleton />}><StatsSection statsPromise={statsPromise} /></Suspense>
      <Suspense fallback={<Skeleton />}><UserTable usersPromise={usersPromise} /></Suspense>
    </div>
  );
}
```

---

## ❌ 6. Tailwind v3 の記法を v4 環境で使う

```
// ❌ NG: tailwind.config.ts を作成する (v4 では不要)
// ❌ NG: @apply を多用する
// ❌ NG: v3 の content 設定
```

```css
/* ❌ NG: v3 スタイル */
@tailwind base;
@tailwind components;
@tailwind utilities;

.btn {
  @apply px-4 py-2 bg-blue-500 text-white rounded;
}
```

```css
/* ✅ OK: v4 スタイル */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.5 0.2 250);
}
```

```typescript
// ❌ NG: tailwind.config.ts
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
};

// ✅ OK: 設定ファイルは不要 (v4)
```

---

## ❌ 7. ESLint / Prettier の使用

```json
// ❌ NG: package.json
{
  "devDependencies": {
    "eslint": "^8",
    "prettier": "^3",
    "@typescript-eslint/parser": "^6"
  }
}
```

```json
// ✅ OK: Biome を使う
{
  "devDependencies": {
    "@biomejs/biome": "^1"
  }
}
```

---

## ❌ 8. `useState` でサーバー状態を管理する

```tsx
// ❌ NG: サーバーデータを useState で管理
"use client";

const [users, setUsers] = useState<User[]>([]);

// キャッシュ、再取得、エラーハンドリングを全部自前で実装する羽目になる
```

```tsx
// ✅ OK: SWR で管理 (キャッシュ、再取得が自動)
"use client";

const { data: users } = useSWR<User[]>("/api/users", fetcher);
```

---

## ❌ 9. Props Drilling の深いネスト

```tsx
// ❌ NG: 5階層以上の Props Drilling
<App user={user}>
  <Layout user={user}>
    <Header user={user}>
      <Navigation user={user}>
        <UserMenu user={user} /> {/* やっと使う */}
      </Navigation>
    </Header>
  </Layout>
</App>
```

```tsx
// ✅ OK: Jotai atom で解決
// store/atoms.ts
export const currentUserAtom = atom<User | null>(null);

// components/user-menu.tsx
"use client";
const user = useAtomValue(currentUserAtom); // どこからでもアクセス
```

---

## ❌ 10. 型アサーション (`as`) の乱用

```typescript
// ❌ NG: 根拠なき型アサーション
const user = data as User; // data が本当に User かわからない
const el = document.getElementById("root") as HTMLDivElement; // null の可能性

// ✅ OK: 適切なチェック後にアサーション
const el = document.getElementById("root");
if (!(el instanceof HTMLDivElement)) throw new Error("root not found");

// ✅ OK: zod でバリデーション
const user = userSchema.parse(data); // 型安全 + バリデーション
```

---

## チェックリスト

実装時に以下を確認:

- [ ] `useEffect` + `fetch` を使っていないか
- [ ] `any` 型を使っていないか
- [ ] 不要な `'use client'` を付けていないか
- [ ] Tailwind v3 の記法 (`tailwind.config.ts`, `@apply`) を使っていないか
- [ ] ESLint / Prettier をインストールしていないか
- [ ] サーバーデータを `useState` で管理していないか
- [ ] コンポーネントが100行を大幅に超えていないか (責務分割の検討)
