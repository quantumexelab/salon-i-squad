/** Names that look like test / placeholder catalog rows (not real salon offerings). */
const KNOWN_DUMMY_NAMES = new Set([
  "test",
  "test 1",
  "test 2",
  "test1",
  "test2",
  "dummy",
  "beard shave",
  "hair shave",
]);

export function isDummyCatalogServiceName(name: string): boolean {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (!n) return true;
  if (KNOWN_DUMMY_NAMES.has(n)) return true;
  if (/^(test|dummy|asdf|xxx|temp)(\s|$|\d|_)/i.test(n)) return true;
  return false;
}

export function isDummyCatalogService(service: { name: string }): boolean {
  return isDummyCatalogServiceName(service.name);
}
