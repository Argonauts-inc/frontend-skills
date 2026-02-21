# Testing

Vitest + @testing-library/react を使ったコンポーネント・フックのテストパターン。

---

## セットアップ

### インストール

```bash
bun add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

### vitest.config.ts

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules/", "src/test/"],
    },
  },
});
```

### src/test/setup.ts

```ts
// src/test/setup.ts
import "@testing-library/jest-dom";
```

### tsconfig.json への追加

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

---

## コンポーネントテスト基本

```tsx
// components/greeting.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Greeting } from "./greeting";

describe("Greeting", () => {
  it("名前を表示する", () => {
    render(<Greeting name="太郎" />);
    expect(screen.getByText("こんにちは、太郎さん")).toBeInTheDocument();
  });

  it("ボタンクリックでカウントが増加する", async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={0} />);

    const button = screen.getByRole("button", { name: "増加" });
    await user.click(button);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("フォームに入力して送信できる", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("メールアドレス"), "test@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });
});
```

### クエリの優先順位 (Testing Library 推奨順)

```ts
// 1. アクセシブルなクエリ (推奨)
screen.getByRole("button", { name: "送信" });
screen.getByLabelText("メールアドレス");
screen.getByPlaceholderText("検索...");
screen.getByText("見出しテキスト");

// 2. セマンティクスクエリ
screen.getByAltText("ロゴ画像");
screen.getByTitle("閉じる");

// 3. テスト用属性 (他の方法が使えない場合のみ)
screen.getByTestId("custom-element");
```

---

## 非同期処理

### findBy クエリ (非同期要素の待機)

```tsx
// components/user-list.test.tsx
import { render, screen } from "@testing-library/react";
import { UserList } from "./user-list";

it("ユーザー一覧を読み込んで表示する", async () => {
  render(<UserList />);

  // ローディング中の表示確認
  expect(screen.getByText("読み込み中...")).toBeInTheDocument();

  // 非同期で表示される要素を待機 (デフォルトタイムアウト: 1000ms)
  const userName = await screen.findByText("山田 太郎");
  expect(userName).toBeInTheDocument();
});
```

### waitFor (条件が満たされるまで待機)

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("送信後に成功メッセージが表示される", async () => {
  const user = userEvent.setup();
  render(<ContactForm />);

  await user.type(screen.getByLabelText("名前"), "山田 太郎");
  await user.click(screen.getByRole("button", { name: "送信" }));

  await waitFor(() => {
    expect(screen.getByText("送信が完了しました")).toBeInTheDocument();
  });
});
```

---

## fetch / API のモック

### vi.mock でモジュールをモック

```tsx
// components/user-profile.test.tsx
import { render, screen } from "@testing-library/react";
import { UserProfile } from "./user-profile";

// fetch のグローバルモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ id: 1, name: "山田 太郎", email: "taro@example.com" }),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

it("ユーザー情報を表示する", async () => {
  render(<UserProfile userId={1} />);
  expect(await screen.findByText("山田 太郎")).toBeInTheDocument();
  expect(screen.getByText("taro@example.com")).toBeInTheDocument();
});
```

### MSW (Mock Service Worker) パターン

ネットワーク層でのモックが必要な場合 (SWR, React Query, fetch など統合テスト向け)。

```bash
bun add -D msw
```

```ts
// src/test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: "山田 太郎",
      email: "taro@example.com",
    });
  }),

  http.post("/api/contact", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, id: "abc123" });
  }),
];
```

```ts
// src/test/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```ts
// src/test/setup.ts
import "@testing-library/jest-dom";
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```tsx
// 特定のテストでハンドラーを上書き
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";

it("API エラー時にエラーメッセージを表示する", async () => {
  server.use(
    http.get("/api/users/:id", () => {
      return HttpResponse.json({ error: "Not Found" }, { status: 404 });
    }),
  );

  render(<UserProfile userId={999} />);
  expect(await screen.findByText("ユーザーが見つかりません")).toBeInTheDocument();
});
```

---

## カスタムフックのテスト

```tsx
// hooks/use-counter.test.ts
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./use-counter";

describe("useCounter", () => {
  it("初期値が設定される", () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it("increment でカウントが増加する", () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it("非同期処理を含むフックのテスト", async () => {
    const { result } = renderHook(() => useUserData(1));

    // 初期状態
    expect(result.current.isLoading).toBe(true);

    // データ取得完了を待機
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.name).toBe("山田 太郎");
  });
});
```

### Context を必要とするフックのテスト

```tsx
// フックが Provider を必要とする場合
import { renderHook } from "@testing-library/react";
import { AuthProvider } from "@/providers/auth";
import { useAuth } from "./use-auth";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

it("認証済みユーザーを返す", async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.user).not.toBeNull());
  expect(result.current.user?.name).toBe("山田 太郎");
});
```

---

## Suspense コンポーネントのテスト

```tsx
// components/suspense-user.test.tsx
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { SuspenseUser } from "./suspense-user";

it("Suspense のフォールバックからコンテンツに切り替わる", async () => {
  render(
    <Suspense fallback={<div>読み込み中...</div>}>
      <SuspenseUser userId={1} />
    </Suspense>,
  );

  // フォールバックが表示される
  expect(screen.getByText("読み込み中...")).toBeInTheDocument();

  // コンテンツが表示されるまで待機
  expect(await screen.findByText("山田 太郎")).toBeInTheDocument();
  expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
});
```

---

## テストファイルの命名と配置規約

### 推奨: コンポーネントと同じディレクトリに配置

```
src/
├── components/
│   ├── button.tsx
│   ├── button.test.tsx          # 同ディレクトリに配置
│   ├── user-card/
│   │   ├── index.tsx
│   │   └── index.test.tsx
└── hooks/
    ├── use-auth.ts
    └── use-auth.test.ts
```

### 代替: __tests__ ディレクトリを使う場合

```
src/
├── components/
│   └── button.tsx
└── __tests__/
    └── components/
        └── button.test.tsx
```

### ファイル命名規則

- コンポーネント: `*.test.tsx`
- フック・ユーティリティ: `*.test.ts`
- 統合テスト: `*.integration.test.tsx`
- E2E (Playwright): `*.spec.ts` を `e2e/` ディレクトリに配置

---

## package.json スクリプト

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

`bun test` でも vitest が起動する (`vitest` を直接実行するのと同等)。

---

## よくあるパターン

### vi.fn() でコールバックをモック

```tsx
it("onChange が呼ばれる", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<SearchInput onChange={onChange} />);

  await user.type(screen.getByRole("textbox"), "test");

  expect(onChange).toHaveBeenCalledTimes(4); // "t", "e", "s", "t"
  expect(onChange).toHaveBeenLastCalledWith("test");
});
```

### スナップショットテスト (最小限の使用)

```tsx
// UI の意図しない変更を検出するためにのみ使用
it("ボタンのスナップショット", () => {
  const { container } = render(<Button variant="primary">送信</Button>);
  expect(container.firstChild).toMatchSnapshot();
});
```

### タイマーのモック

```tsx
it("3秒後にトーストが消える", async () => {
  vi.useFakeTimers();

  render(<Toast message="保存しました" />);
  expect(screen.getByText("保存しました")).toBeInTheDocument();

  vi.advanceTimersByTime(3000);

  await waitFor(() => {
    expect(screen.queryByText("保存しました")).not.toBeInTheDocument();
  });

  vi.useRealTimers();
});
```
