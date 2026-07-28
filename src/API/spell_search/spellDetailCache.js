const cache = new Map();

export function getCachedSpellDetail(spellId) {
  return cache.get(spellId);
}

export function setCachedSpellDetail(spellId, detail) {
  cache.set(spellId, detail);
}
