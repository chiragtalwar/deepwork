import { useState, useCallback, useRef, useEffect } from 'react';

export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const hasInitialDataRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const withLoading = useCallback(async (fn: () => Promise<void>, showLoading = true) => {
    try {
      if (showLoading && !hasInitialDataRef.current && mounted.current) {
        setIsLoading(true);
      }
      await fn();
      hasInitialDataRef.current = true;
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  return { isLoading, withLoading };
} 