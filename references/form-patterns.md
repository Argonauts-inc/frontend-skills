# Form Patterns

react-hook-form + zod + shadcn/ui を使ったフォーム実装パターン。

---

## 基本パターン

### 1. zod スキーマ定義

```ts
// schemas/contact.ts
import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  message: z.string().min(10, "メッセージは10文字以上で入力してください").max(500),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
```

### 2. useForm with zodResolver

```tsx
// components/contact-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactFormValues } from "@/schemas/contact";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  function onSubmit(values: ContactFormValues) {
    // values は ContactFormValues 型で型安全
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名前</FormLabel>
              <FormControl>
                <Input placeholder="山田 太郎" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input type="email" placeholder="taro@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メッセージ</FormLabel>
              <FormControl>
                <Textarea placeholder="お問い合わせ内容を入力してください" {...field} />
              </FormControl>
              <FormDescription>10〜500文字で入力してください</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          送信
        </Button>
      </form>
    </Form>
  );
}
```

---

## エラー表示

`FormMessage` コンポーネントが field レベルのエラーを自動表示する。
`form.formState.errors` でプログラムからもアクセス可能。

```tsx
// フォーム送信後のサーバーエラーを手動でセット
form.setError("email", {
  type: "server",
  message: "このメールアドレスはすでに登録されています",
});

// ルートレベルエラー (全体エラー) のセット
form.setError("root", {
  message: "送信に失敗しました。しばらく経ってから再度お試しください",
});
```

```tsx
// root エラーの表示
{form.formState.errors.root && (
  <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
)}
```

---

## Server Action 連携 (Next.js)

### startTransition + Server Action

```tsx
// app/contact/page.tsx (Server Component)
import { ContactForm } from "@/components/contact-form";
import { sendContact } from "@/app/actions/contact";

export default function ContactPage() {
  return <ContactForm action={sendContact} />;
}
```

```ts
// app/actions/contact.ts
"use server";

import { contactSchema } from "@/schemas/contact";

export async function sendContact(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  };

  const result = contactSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten() };
  }

  // DB 保存 / メール送信など
  await db.contact.create({ data: result.data });

  return { success: true };
}
```

```tsx
// components/contact-form.tsx (react-hook-form + Server Action)
"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactFormValues } from "@/schemas/contact";
import { sendContact } from "@/app/actions/contact";
// shadcn/ui Form コンポーネント ...

type Props = {
  action: typeof sendContact;
};

export function ContactForm({ action }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  function onSubmit(values: ContactFormValues) {
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) {
        formData.append(key, value);
      }
      const result = await action(formData);
      if (result?.error) {
        // サーバーサイドバリデーションエラーをフォームにセット
        form.setError("root", { message: "送信に失敗しました" });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ... fields ... */}
        <Button type="submit" disabled={isPending || form.formState.isSubmitting}>
          {isPending ? "送信中..." : "送信"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 複合フォーム

### 条件付きフィールド (watch)

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("individual"), name: z.string().min(1) }),
  z.object({
    type: z.literal("company"),
    companyName: z.string().min(1),
    department: z.string().optional(),
  }),
]);

type FormValues = z.infer<typeof schema>;

export function TypedForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "individual", name: "" },
  });

  const type = form.watch("type");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>種別</FormLabel>
              <FormControl>
                <select {...field}>
                  <option value="individual">個人</option>
                  <option value="company">法人</option>
                </select>
              </FormControl>
            </FormItem>
          )}
        />

        {type === "individual" && (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>氏名</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {type === "company" && (
          <>
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>会社名</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>部署名 (任意)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit">送信</Button>
      </form>
    </Form>
  );
}
```

### フィールド配列 (useFieldArray)

```tsx
"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  members: z
    .array(
      z.object({
        name: z.string().min(1, "名前は必須です"),
        email: z.string().email("有効なメールアドレスを入力してください"),
      }),
    )
    .min(1, "少なくとも1名のメンバーが必要です"),
});

type FormValues = z.infer<typeof schema>;

export function MemberForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      members: [{ name: "", email: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-6">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-end">
            <FormField
              control={form.control}
              name={`members.${index}.name`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>名前</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`members.${index}.email`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="destructive"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
            >
              削除
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => append({ name: "", email: "" })}
        >
          メンバーを追加
        </Button>

        <Button type="submit">保存</Button>
      </form>
    </Form>
  );
}
```

---

## 再利用パターン: カスタムフック化

複数ページで同じフォームロジックを共有する場合はカスタムフックに切り出す。

```ts
// hooks/use-contact-form.ts
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { contactSchema, type ContactFormValues } from "@/schemas/contact";

type UseContactFormOptions = {
  onSuccess?: () => void;
  defaultValues?: Partial<ContactFormValues>;
};

export function useContactForm({ onSuccess, defaultValues }: UseContactFormOptions = {}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
      ...defaultValues,
    },
  });

  function submit(values: ContactFormValues) {
    startTransition(async () => {
      try {
        await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        form.reset();
        onSuccess?.();
      } catch {
        form.setError("root", { message: "送信に失敗しました" });
      }
    });
  }

  return {
    form,
    isPending,
    onSubmit: form.handleSubmit(submit),
  };
}
```

```tsx
// 使用例
export function ContactPage() {
  const { form, isPending, onSubmit } = useContactForm({
    onSuccess: () => router.push("/contact/thanks"),
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>{/* fields */}</form>
    </Form>
  );
}
```

---

## 注意事項

- `<Form>` コンポーネントは shadcn/ui の `npx shadcn add form` でインストールする
- `zodResolver` は `@hookform/resolvers` パッケージに含まれている
- Server Component では `useForm` は使えない。必ず `"use client"` を付与する
- `form.formState.isSubmitting` は `handleSubmit` の非同期処理中に `true` になる
- `useFieldArray` の `field.id` を `key` に使うこと (`index` を使うとバグの原因になる)
