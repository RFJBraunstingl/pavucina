const LEGACY_GITHUB_ID = /^[0-9a-f-]+$/i;
const PROVIDER_USER_ID = /^(github|google):([a-z0-9_-]+)$/i;

function parseUserId(userId: string) {
  if (LEGACY_GITHUB_ID.test(userId)) return ["github", userId] as const;
  const match = PROVIDER_USER_ID.exec(userId);
  if (!match) throw new Error("Invalid OAuth user ID");
  return [match[1].toLowerCase(), match[2]] as const;
}

export function createUserId(provider: string, providerAccountId: string) {
  const userId = `${provider}:${providerAccountId}`;
  parseUserId(userId);
  return userId;
}

export function graphCollectionPrefix(userId: string) {
  const [provider, providerAccountId] = parseUserId(userId);
  return `${provider}_${providerAccountId}`;
}

export function preferenceStorageUserId(userId: string) {
  const [provider, providerAccountId] = parseUserId(userId);
  return provider === "github" ? providerAccountId : userId;
}
