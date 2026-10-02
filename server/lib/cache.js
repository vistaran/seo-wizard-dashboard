// Tiny in-memory TTL cache to keep GSC/GA4 calls from hammering Google on every render.
const store = new Map();

function cached(key, ttlMs, fn) {
  const hit = store.get(key);
  if (hit && Date.now() < hit.exp) return Promise.resolve(hit.value);
  const p = Promise.resolve(fn()).then((value) => {
    store.set(key, { value, exp: Date.now() + ttlMs });
    return value;
  });
  // store a pending promise so concurrent calls share the same in-flight request
  return p;
}

function clear(prefix) {
  for (const k of store.keys()) if (!prefix || k.startsWith(prefix)) store.delete(k);
}

module.exports = { cached, clear };
