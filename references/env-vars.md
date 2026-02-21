# Environment Variables

Next.js / Vite プロジェクトでの環境変数管理パターン。

---

## Next.js の環境変数

### ファイルの使い分け

| ファイル | 用途 | Git 管理 |
|---------|------|---------|
| `.env.local` | ローカル開発用 (各開発者が設定) | **しない** (.gitignore に追加) |
| `.env.development` | 開発環境デフォルト値 | する |
| `.env.production` | 本番環境デフォルト値 | する (シークレットは含めない) |
| `.env.example` | 必要な変数の一覧 (値はダミー) | **する** |
| `.env` | すべての環境共通のデフォルト値 | する (シークレットは含めない) |

**優先順位**: `.env.local` > `.env.{NODE_ENV}` > `.env`

### NEXT_PUBLIC_ プレフィックス

```bash
# .env.local

# サーバーサイドのみ (Route Handler / Server Component / Server Action)
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
API_SECRET_KEY="super-secret-key"

# クライアントに公開される (ブラウザから参照可能)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="https://api.example.com"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

```tsx
// Server Component / Route Handler / Server Action
// process.env で直接アクセス
export async function GET() {
  const client = createClient(process.env.DATABASE_URL!);
  // ...
}

// Client Component
// NEXT_PUBLIC_ のみアクセス可能
export function AnalyticsButton() {
  // ビルド時にインライン化される
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  // ...
}
```

### .env.example

```bash
# .env.example (コミットする)
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
API_SECRET_KEY="your-secret-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="https://api.example.com"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

---

## Vite の環境変数

### VITE_ プレフィックス必須

```bash
# .env.local

# VITE_ プレフィックスがないとクライアントから参照不可
VITE_API_BASE_URL="https://api.example.com"
VITE_APP_NAME="My App"

# VITE_ なし = サーバー (Node.js) のみ (Vite config など)
SECRET_KEY="build-time-secret"
```

### import.meta.env でアクセス

```ts
// src/config.ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const appName = import.meta.env.VITE_APP_NAME;

// 組み込み変数
const isDev = import.meta.env.DEV;          // true in dev mode
const isProd = import.meta.env.PROD;        // true in prod mode
const mode = import.meta.env.MODE;          // "development" | "production"
const baseUrl = import.meta.env.BASE_URL;   // vite.config.ts の base 設定
```

### TypeScript の型付け

```ts
// src/vite-env.d.ts (vite create 時に自動生成される)
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  // 追加の環境変数はここに定義する
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## zod で環境変数をバリデーション

起動時に必須変数の存在と型を検証することで、実行時エラーを防止する。

### Next.js 向け

```ts
// src/env.ts
import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url(),
  API_SECRET_KEY: z.string().min(32),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

// サーバー変数 (クライアントバンドルには含まれない)
const _serverEnv = serverSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  API_SECRET_KEY: process.env.API_SECRET_KEY,
});

if (!_serverEnv.success && typeof window === "undefined") {
  console.error("❌ 環境変数が正しく設定されていません:");
  console.error(_serverEnv.error.flatten().fieldErrors);
  process.exit(1);
}

// クライアント変数
const _clientEnv = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

if (!_clientEnv.success) {
  console.error("❌ NEXT_PUBLIC_ 環境変数が正しく設定されていません:");
  console.error(_clientEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const serverEnv = _serverEnv.data!;
export const clientEnv = _clientEnv.data!;

// 型エクスポート
export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
```

```ts
// 使用例
import { serverEnv, clientEnv } from "@/env";

// Server Component / Route Handler
const db = createClient(serverEnv.DATABASE_URL);

// Client Component
fetch(`${clientEnv.NEXT_PUBLIC_API_BASE_URL}/users`);
```

### Vite 向け

```ts
// src/env.ts
import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_NAME: z.string().min(1),
});

const _env = envSchema.safeParse(import.meta.env);

if (!_env.success) {
  console.error("❌ 環境変数が正しく設定されていません:");
  console.error(_env.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = _env.data;

// 型エクスポート
export type Env = z.infer<typeof envSchema>;
```

```ts
// src/api/client.ts
import { env } from "@/env";

export const apiClient = {
  baseUrl: env.VITE_API_BASE_URL,
  get: (path: string) => fetch(`${env.VITE_API_BASE_URL}${path}`),
};
```

### @t3-oss/env-nextjs を使う場合 (推薦ライブラリ)

上記の手動実装の代わりに公式ライブラリを使うと簡潔に書ける。

```bash
bun add @t3-oss/env-nextjs zod
```

```ts
// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    API_SECRET_KEY: z.string().min(32),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  },
  // Next.js の process.env を自動的に参照
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
});
```

---

## .gitignore の設定

```bash
# .gitignore
.env.local
.env.*.local

# .env.example はコミットする (上記パターンでは除外されない)
```

---

## デプロイ環境での設定

### Vercel

```bash
# Vercel CLI で設定
vercel env add DATABASE_URL production
vercel env add API_SECRET_KEY production

# または vercel.json に設定 (シークレットは直書きしない)
```

### Docker / Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    env_file:
      - .env.local
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
```

---

## 注意事項

1. **`.env.local` は `.gitignore` に含める**: シークレットをコミットしない
2. **`.env.example` は常に最新を維持**: 新しい変数追加時は必ず例も追加
3. **`NEXT_PUBLIC_` / `VITE_` 以外の変数はクライアントに露出しない**: バンドルに含まれない
4. **`process.env.XXX` は動的アクセス不可 (Next.js)**: ビルド時に静的解析されるため `process.env[key]` は動作しない
5. **zod バリデーションをアプリ起動時に必ず実行**: 本番環境での設定ミスを早期発見する
6. **型アサーション (`!`) より zod バリデーション**: `process.env.XXX!` を直接使わず、検証済みの `env.XXX` を使う
