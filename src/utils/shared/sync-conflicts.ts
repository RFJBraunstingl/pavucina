import type { GraphOperation, SyncConflict } from "@/types/graph/graph-sync.ts";

export function withoutConflictingOperations(operations: GraphOperation[], conflicts: SyncConflict[]) {
  if (conflicts.some((conflict) => conflict.id === "graph")) return [];
  return operations.flatMap((operation) => {
    const affected = conflicts.filter((conflict) => conflict.id === operation.id);
    if (!affected.length) return [operation];
    if (operation.kind !== "update" || affected.some((conflict) => conflict.field === "deleted item")) return [];
    const fields = Object.fromEntries(Object.entries(operation.fields).filter(([key]) => !affected.some((conflict) => conflict.field === key)));
    return Object.keys(fields).length ? [{ ...operation, fields }] : [];
  });
}
