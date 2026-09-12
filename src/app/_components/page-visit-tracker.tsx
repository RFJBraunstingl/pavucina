"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { usePreferences } from "./use-preferences";
import {
  appPageFromPathname,
  MOBILE_VIEW_QUERY,
  withLastPage,
} from "@/utils/navigation";

export default function PageVisitTracker() {
  const pathname = usePathname();
  const { preferences, setPreferences } = usePreferences();
  const preferencesLoaded = preferences !== null;

  useEffect(() => {
    if (!preferencesLoaded) return;
    const page = appPageFromPathname(pathname);
    if (!page) return;
    const mobile = window.matchMedia(MOBILE_VIEW_QUERY).matches;
    setPreferences((current) =>
      current ? withLastPage(current, page, mobile) : current,
    );
  }, [pathname, preferencesLoaded, setPreferences]);

  return null;
}
