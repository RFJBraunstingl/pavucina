"use client";

import { SessionProvider } from "next-auth/react";
import { GraphProvider } from "@/providers/graph-provider";
import { CalendarImportProvider } from "@/providers/calendar-import-provider";
import PageVisitTracker from "./page-visit-tracker";
import { PreferencesProvider } from "./use-preferences";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GraphProvider>
        <PreferencesProvider>
          <CalendarImportProvider>
            <PageVisitTracker />
            {children}
          </CalendarImportProvider>
        </PreferencesProvider>
      </GraphProvider>
    </SessionProvider>
  );
}
