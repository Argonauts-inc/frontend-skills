# 状態管理 選択ガイド

## 判断フローチャート

```
状態はどこで必要？
│
├── 1つのコンポーネント内だけ
│   └── useState / useReducer ✅
│
├── サーバーから取得したデータ
│   └── SWR / TanStack Query ✅
│
├── URL で共有したい状態
│   └── useSearchParams (Next.js) / URLSearchParams ✅
│
├── 複数コンポーネントで共有
│   ├── 軽量 (atoms, シンプルな値) → Jotai ✅
│   └── 複雑 (複数のアクション、computed state) → Zustand ✅
│
└── props drilling を解消したいだけ
    └── Context API (慎重に使う) ⚠️
```

---

## 1. Local UI State: `useState` / `useReducer`

最初に検討すべき選択肢。グローバル状態にする前にローカル状態で解決できないか確認する。

```tsx
// useState: 単純な値
"use client";
const [isOpen, setIsOpen] = useState(false);
const [count, setCount] = useState(0);

// useReducer: 複雑な状態遷移
type State = { count: number; error: string | null };
type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "reset" }
  | { type: "setError"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "increment":
      return { ...state, count: state.count + 1 };
    case "decrement":
      return { ...state, count: state.count - 1 };
    case "reset":
      return { count: 0, error: null };
    case "setError":
      return { ...state, error: action.payload };
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0, error: null });
```

---

## 2. Server State: SWR

サーバーから取得したデータの管理には SWR を使う。ローカルにキャッシュし、再取得を自動化する。

```typescript
// hooks/use-users.ts
import useSWR from "swr";

export const useUsers = () => {
  const { data, error, isLoading, mutate } = useSWR<User[]>("/api/users", fetcher);
  return {
    users: data ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
};
```

> SWR の詳細は [data-fetching.md](data-fetching.md) を参照

---

## 3. URL State: `useSearchParams`

フィルタ・ページネーション・ソートなどの状態は URL で管理する。ブックマーク・共有が可能になる。

```tsx
// Next.js App Router
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export const FilterPanel = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentFilter = searchParams.get("filter") ?? "all";

  const setFilter = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", filter);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div>
      <button onClick={() => setFilter("active")}>Active</button>
      <button onClick={() => setFilter("inactive")}>Inactive</button>
    </div>
  );
};
```

---

## 4. Jotai (軽量グローバル状態)

コンポーネントをまたいだ状態で、シンプルな atom ベースの管理が適切な場合に使用。

```bash
pnpm add jotai
```

### 基本的な使い方

```typescript
// store/atoms.ts
import { atom } from "jotai";

// プリミティブな atom
export const userAtom = atom<User | null>(null);
export const themeAtom = atom<"light" | "dark">("light");
export const sidebarOpenAtom = atom(false);

// 派生 atom (computed)
export const isLoggedInAtom = atom((get) => get(userAtom) !== null);
```

```tsx
// components/sidebar.tsx
"use client";

import { useAtom, useAtomValue } from "jotai";
import { sidebarOpenAtom, isLoggedInAtom } from "@/store/atoms";

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useAtom(sidebarOpenAtom);
  const isLoggedIn = useAtomValue(isLoggedInAtom);

  if (!isLoggedIn) return null;

  return (
    <aside className={cn("fixed inset-y-0 left-0 w-64", !isOpen && "hidden")}>
      {/* ... */}
    </aside>
  );
};
```

### 非同期 atom

```typescript
// store/user-atoms.ts
import { atom } from "jotai";
import { atomWithSWR } from "jotai-swr"; // jotai-swr パッケージ

// または loadable で非同期処理
export const asyncUserAtom = atom(async () => {
  const res = await fetch("/api/me");
  return res.json() as Promise<User>;
});
```

---

## 5. Zustand (複雑なグローバル状態)

複数のアクション、ミドルウェア、複雑な状態遷移が必要な場合に使用。

```bash
pnpm add zustand
```

```typescript
// store/use-cart-store.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      immer((set, get) => ({
        items: [],

        addItem: (item) => {
          set((state) => {
            const existing = state.items.find((i) => i.id === item.id);
            if (existing) {
              existing.quantity += 1;
            } else {
              state.items.push({ ...item, quantity: 1 });
            }
          });
        },

        removeItem: (id) => {
          set((state) => {
            state.items = state.items.filter((i) => i.id !== id);
          });
        },

        updateQuantity: (id, quantity) => {
          set((state) => {
            const item = state.items.find((i) => i.id === id);
            if (item) item.quantity = quantity;
          });
        },

        clearCart: () => set({ items: [] }),

        totalPrice: () =>
          get().items.reduce(
            (total, item) => total + item.price * item.quantity,
            0,
          ),
      })),
      { name: "cart-storage" },
    ),
  ),
);
```

```tsx
// 使用例
"use client";

import { useCartStore } from "@/store/use-cart-store";

export const CartCount = () => {
  const itemCount = useCartStore((state) => state.items.length);
  return <span>{itemCount}</span>;
};

export const AddToCartButton = ({ product }: { product: Product }) => {
  const addItem = useCartStore((state) => state.addItem);
  return (
    <button onClick={() => addItem(product)}>Add to Cart</button>
  );
};
```

---

## 6. Context API (慎重に使う)

Props drilling を解消する目的で使う。頻繁に更新される状態には適さない（再レンダリングが多発する）。

```tsx
// contexts/auth-context.tsx
"use client";

import { createContext, useContext, useState } from "react";

interface AuthContextValue {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const user = await authenticate(credentials);
    setUser(user);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
```

---

## 選択のまとめ

| ユースケース | 解決策 |
|------------|--------|
| モーダルの開閉 | `useState` |
| フォームの状態 | `useForm` (react-hook-form) |
| API データのキャッシュ | SWR |
| フィルタ・ページ | URL State (`useSearchParams`) |
| テーマ切り替え | Jotai atom |
| 通知・トースト | Jotai atom |
| ショッピングカート | Zustand (persist) |
| 認証状態 | Context API または Jotai atom |
| 複雑なフォームウィザード | Zustand |
