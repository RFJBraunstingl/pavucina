export async function requireSuccess(response: Response, fallback: string) {
  if (response.ok) return;
  const value: unknown = await response.json().catch(() => null);
  const message = value && typeof value === "object" && "error" in value &&
    typeof value.error === "string" ? value.error : fallback;
  throw new Error(message);
}
