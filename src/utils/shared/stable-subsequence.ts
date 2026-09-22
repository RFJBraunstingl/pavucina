export function longestStableSubsequence(before: string[], after: string[]) {
  const positions = new Map(before.map((id, index) => [id, index]));
  const entries = after.flatMap((id) => {
    const position = positions.get(id);
    return position === undefined ? [] : [{ id, position }];
  });
  const tails: number[] = [];
  const previous = new Map<number, number>();
  for (let index = 0; index < entries.length; index++) {
    const { position } = entries[index];
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (entries[tails[middle]].position < position) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    previous.set(index, low ? tails[low - 1] : -1);
    tails[low] = index;
  }
  const stable = new Set<string>();
  for (
    let index = tails.at(-1) ?? -1;
    index >= 0;
    index = previous.get(index) ?? -1
  ) {
    stable.add(entries[index].id);
  }
  return stable;
}
