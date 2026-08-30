"use client";

import { SessionProvider } from "next-auth/react";
import { GraphProvider } from "@/providers/graph-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GraphProvider>{children}</GraphProvider>
    </SessionProvider>
  );
}
