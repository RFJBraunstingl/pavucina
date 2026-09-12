"use client";

import { SessionProvider } from "next-auth/react";
import { GraphProvider } from "@/providers/graph-provider";
import PageVisitTracker from "./page-visit-tracker";
import { PreferencesProvider } from "./use-preferences";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GraphProvider>
        <PreferencesProvider>
          <PageVisitTracker />
          {children}
        </PreferencesProvider>
      </GraphProvider>
    </SessionProvider>
  );
}
