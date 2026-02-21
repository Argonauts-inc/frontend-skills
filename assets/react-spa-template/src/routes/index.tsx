import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold tracking-tight">Hello, World!</h1>
      <p className="mt-4 text-muted-foreground">
        Get started by editing{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
          src/routes/index.tsx
        </code>
      </p>
    </div>
  );
}
