export function providerRecord(value: unknown) {
  return value && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
}

export function providerRecords(value: unknown, key: string) {
  const parent = providerRecord(value);
  return parent && Array.isArray(parent[key]) ? parent[key] as unknown[] : [];
}

export function providerObject(value: unknown, key: string) {
  return providerRecord(providerRecord(value)?.[key]);
}

export function providerText(value: unknown, key: string) {
  const parent = providerRecord(value);
  return parent && typeof parent[key] === "string"
    ? parent[key] as string
    : undefined;
}
