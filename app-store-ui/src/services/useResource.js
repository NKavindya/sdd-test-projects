import { useCallback, useEffect, useRef, useState } from 'react';

export function useResource(load, dependencies, enabled = true) {
  const loader = useRef(load);
  loader.current = load;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    data: null,
    loading: enabled,
    error: null,
  });
  const key = JSON.stringify(dependencies);
  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    let active = true;
    setState({ data: null, loading: true, error: null });
    Promise.resolve()
      .then(() => loader.current(controller.signal))
      .then(
        (data) => {
          if (active) setState({ data, loading: false, error: null });
        },
        (error) => {
          if (active && error.code !== 'ERR_CANCELED')
            setState({ data: null, loading: false, error });
        },
      );
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, revision, enabled]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { ...state, reload };
}
