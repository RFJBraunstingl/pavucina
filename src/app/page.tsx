"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { GraphLoading } from "./_components/graph-state";
import { usePreferences } from "./_components/use-preferences";
import {
  appPagePath,
  MOBILE_VIEW_QUERY,
  resolvedStartPage,
} from "@/utils/navigation";

export default function Page() {
  const router = useRouter();
  const { preferences, syncError, retry } = usePreferences();

  useEffect(() => {
    if (!preferences) return;
    const mobile = window.matchMedia(MOBILE_VIEW_QUERY).matches;
    router.replace(appPagePath(resolvedStartPage(preferences, mobile)));
  }, [preferences, router]);

  return (
    <GraphLoading
      label="Opening Pavucina…"
      error={syncError}
      onRetry={retry}
    />
  );
}
