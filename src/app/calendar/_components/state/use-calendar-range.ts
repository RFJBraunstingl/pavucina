import { useMemo, useState } from "react";

import { useCalendarDayCount } from "../navigation/use-calendar-day-count";
import { makeDateRange, startOfWeek } from "@/utils/shared/temporal/date";

export function useCalendarRange(today: string) {
  const [day, setDay] = useState(today);
  const [singleDayLocked, setSingleDayLocked] = useState(true);
  const dayCount = useCalendarDayCount();
  const singleDay = dayCount === 1;
  const days = useMemo(
    () => makeDateRange(singleDay ? day : startOfWeek(day), dayCount),
    [day, dayCount, singleDay],
  );

  return {
    day,
    days,
    dayCount,
    locked: singleDay && singleDayLocked,
    setDay,
    toggleLock: () => setSingleDayLocked((current) => !current),
  };
}
