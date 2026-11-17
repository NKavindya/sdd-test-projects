import { useCallback, useEffect, useRef, useState } from "react";
export function useResource<T>(
  loader: () => Promise<T>,
  dependencies: unknown[] = [],
  enabled = true,
) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>();
  const generation = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const reload = useCallback(async () => {
    if (!enabled) return;
    const id = ++generation.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await loaderRef.current();
      if (id === generation.current) setData(result);
    } catch (failure) {
      if (id === generation.current) setError(failure);
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setData(undefined);
      setError(undefined);
      return;
    }
    void reload();
    return () => {
      generation.current++;
    };
  }, [...dependencies, reload, enabled]);
  return { data, loading, error, reload, setData };
}
