import { useMemo, useState } from "react";

import { getTimelineFilter } from "@/services/timeline-filter-service";
import type { Graph } from "@/types/graph";
import type { TimelineFilterResult } from "@/types/timeline-filter";

const EMPTY_FILTER: TimelineFilterResult = {
  levels: [],
  selections: [],
  tasks: [],
  allowedTaskIds: null,
  expandedTaskIds: new Set(),
  active: false,
};

export function useTimelineFilters(
  graph: Graph | null,
  hideDone: boolean,
  collapsedIds: ReadonlySet<string>,
) {
  const [selections, setSelections] = useState<string[][]>([]);
  const result = useMemo(
    () => graph
      ? getTimelineFilter(graph, selections, hideDone, collapsedIds)
      : EMPTY_FILTER,
    [collapsedIds, graph, hideDone, selections],
  );

  function update(depth: number, selectedIds: string[]) {
    const nextSelections = [...result.selections.slice(0, depth), selectedIds];
    setSelections(nextSelections);
    return graph
      ? getTimelineFilter(graph, nextSelections, hideDone, collapsedIds).allowedTaskIds
      : null;
  }

  return { ...result, update, clear: () => setSelections([]) };
}
