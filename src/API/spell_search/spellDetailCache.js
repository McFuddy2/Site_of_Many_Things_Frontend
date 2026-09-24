import { getUser, subscribe } from "../../auth/session";

const cache = new Map();

// Whether a non-SRD description comes back in full depends on who is signed in,
// so details cached for one account (or a guest) mustn't be reused for another.
let cachedForUserId = getUser()?.id ?? null;
subscribe(() => {
  const userId = getUser()?.id ?? null;
  if (userId !== cachedForUserId) {
    cachedForUserId = userId;
    cache.clear();
  }
});

export function getCachedSpellDetail(spellId) {
  return cache.get(spellId);
}

export function setCachedSpellDetail(spellId, detail) {
  cache.set(spellId, detail);
}
