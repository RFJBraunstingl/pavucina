export function debouncedDescription(commit: (value: string) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let value: string | undefined;

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    value = undefined;
  }

  function flush() {
    const pending = value;
    cancel();
    if (pending !== undefined) commit(pending);
  }

  return {
    get pending() { return value !== undefined; },
    schedule(next: string) {
      cancel();
      value = next;
      timer = setTimeout(flush, 500);
    },
    cancel,
    flush,
  };
}
