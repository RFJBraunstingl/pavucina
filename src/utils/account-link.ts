export function accountLinkOutcome(
  sourceUserId: string,
  targetUserId: string,
) {
  return targetUserId === sourceUserId
    ? { state: "complete" as const }
    : { state: "conflict" as const, targetUserId };
}
