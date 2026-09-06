import type { Metadata } from "next";

import ScheduleView from "./_components/schedule-view";

export const metadata: Metadata = {
  title: "Schedule · Pavucina",
};

export default function Page() {
  return <ScheduleView />;
}
