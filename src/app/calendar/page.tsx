import type { Metadata } from "next";

import CalendarView from "./_components/calendar-view";

export const metadata: Metadata = {
  title: "Calendar · Pavucina",
};

export default function Page() {
  return <CalendarView />;
}
