/**
 * Collapses concurrent calls for the same key into one run.
 *
 * While a run for `key` is in flight, every further call returns that same
 * promise instead of starting another. Once it settles (either way) the key is
 * released, so a later call starts fresh. Pure over the map it is handed, so
 * callers own the lifetime and tests need no module state.
 */
export function singleFlight<K, T>(
  inFlight: Map<K, Promise<T>>,
  key: K,
  run: () => Promise<T>,
): Promise<T> {
  const pending = inFlight.get(key);
  if (pending) return pending;
  const tracked = run().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, tracked);
  return tracked;
}
