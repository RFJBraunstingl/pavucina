import { useMemo, useState } from "react";

import { addDays, makeDateRange } from "@/utils/shared/temporal/date";

const RANGE_SIZE = 28;

export function useTimelineRange(today: string) {
  const [rangeStart, setRangeStart] = useState(() => addDays(today, -14));
  const days = useMemo(() => makeDateRange(rangeStart), [rangeStart]);

  return {
    rangeStart,
    days,
    showPrevious: () => setRangeStart((date) => addDays(date, -RANGE_SIZE)),
    showToday: () => setRangeStart(addDays(today, -14)),
    showNext: () => setRangeStart((date) => addDays(date, RANGE_SIZE)),
  };
}
