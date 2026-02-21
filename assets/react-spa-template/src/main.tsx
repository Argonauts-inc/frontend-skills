import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { SWRConfig } from "swr";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const swrConfig = {
  fetcher: (url: string) =>
    fetch(url).then((res) => {
      if (!res.ok) throw new Error("An error occurred while fetching the data.");
      return res.json();
    }),
  revalidateOnFocus: false,
};

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <SWRConfig value={swrConfig}>
      <RouterProvider router={router} />
    </SWRConfig>
  </StrictMode>,
);
