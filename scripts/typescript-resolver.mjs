export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return nextResolve(new URL("../node_modules/next/dist/compiled/server-only/empty.js", import.meta.url).href, context);
  if (specifier.startsWith("@/")) specifier = new URL(`../src/${specifier.slice(2)}`, import.meta.url).href;
  try { return await nextResolve(specifier, context); }
  catch (error) {
    if ((specifier.startsWith(".") || specifier.startsWith("file:")) && !/\.[a-z]+$/i.test(specifier)) {
      try { return await nextResolve(`${specifier}.ts`, context); } catch { /* Preserve original resolution error. */ }
    }
    throw error;
  }
}
