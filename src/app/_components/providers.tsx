"use client";

import { SessionProvider } from "next-auth/react";
import { GraphProvider } from "@/providers/graph-provider";
import { PreferencesProvider } from "./use-preferences";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GraphProvider>
        <PreferencesProvider>{children}</PreferencesProvider>
      </GraphProvider>
    </SessionProvider>
  );
}
