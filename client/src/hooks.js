import { useEffect, useState, useCallback, useRef } from 'react';

// Generic data-fetch hook with loading / error / silent-refetch.
// - Resets state synchronously when `deps` change (so a tenant switch never renders
//   stale `data` with a false `loading`).
// - `refetch()` updates data WITHOUT flipping the loading flag (no unmount/flicker),
//   so interactive state (e.g. a just-set verify result) survives the refresh.
export function useFetch(fn, deps = []) {
  const depKey = deps.join('\u0000');
  const [state, setState] = useState(() => ({ data: null, loading: true, error: null, key: depKey }));

  // Render-phase adjustment: deps changed → reset before the next commit.
  if (state.key !== depKey) {
    setState({ data: null, loading: true, error: null, key: depKey });
  }

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const refresh = useCallback(async (silent = false) => {
    const currentKey = depKey;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    else setState((s) => ({ ...s, error: null }));
    try {
      const result = await fnRef.current();
      setState((s) => (s.key === currentKey ? { ...s, data: result, loading: false } : s));
    } catch (e) {
      setState((s) => (s.key === currentKey ? { ...s, error: e.message, loading: false } : s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: () => refresh(true),
    reload: () => refresh(false),
  };
}
