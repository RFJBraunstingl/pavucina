import type { GraphOperation, SyncConflict } from "@/types/graph/graph-sync.ts";

export function withoutConflictingOperations(
  operations: GraphOperation[],
  conflicts: SyncConflict[],
) {
  if (conflicts.some((conflict) => conflict.id === "graph")) return [];
  return operations.flatMap((operation) => {
    const operationConflicts = conflicts.filter(
      (conflict) => conflict.id === operation.id,
    );
    if (!operationConflicts.length) return [operation];
    if (operation.kind !== "update" ||
      operationConflicts.some(({ field }) => field === "deleted item")) {
      return [];
    }
    const fields = Object.fromEntries(
      Object.entries(operation.fields).filter(([field]) =>
        !operationConflicts.some((conflict) => conflict.field === field),
      ),
    );
    return Object.keys(fields).length ? [{ ...operation, fields }] : [];
  });
}
