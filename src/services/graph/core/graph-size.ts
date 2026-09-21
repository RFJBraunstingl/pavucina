function mebibytes(value: string | undefined, fallback: number) {
  const amount = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1024) throw new Error("Transfer limits must be whole MiB between 1 and 1024.");
  return amount * 1024 * 1024;
}
export const MAX_MUTATION_BYTES = mebibytes(process.env.NEXT_PUBLIC_MAX_MUTATION_MIB, 10);
export const MAX_SNAPSHOT_BYTES = mebibytes(process.env.NEXT_PUBLIC_MAX_SNAPSHOT_MIB, 100);
export const MAX_BACKUP_BYTES = MAX_SNAPSHOT_BYTES + 1024 * 1024;
