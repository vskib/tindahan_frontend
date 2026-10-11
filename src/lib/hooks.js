import { useEffect, useState, useCallback } from 'react';

/** Runs an async loader whenever deps change; keeps the previous data visible while reloading. */
export function useFetch(loader, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().then(
      (data) => { if (!cancelled) setState({ data, loading: false, error: null }); },
      (error) => { if (!cancelled) setState((s) => ({ data: s.data, loading: false, error })); },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
