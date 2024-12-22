import { useState, useCallback, useRef, useEffect } from 'react';

export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const hasInitialDataRef = useRef(false);
  const mounted = useRef(true);
  const pendingFetchRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      hasInitialDataRef.current = false;
    };
  }, []);

  const withLoading = useCallback(async (fn: () => Promise<void>, showLoading = true) => {
    if (pendingFetchRef.current) {
      return;
    }

    pendingFetchRef.current = true;
    let shouldShowLoading = showLoading && !hasInitialDataRef.current;

    try {
      if (shouldShowLoading && mounted.current) {
        setIsLoading(true);
      }

      await fn();
      hasInitialDataRef.current = true;
    } catch (error) {
      console.error('Loading state error:', error);
      hasInitialDataRef.current = false;
    } finally {
      pendingFetchRef.current = false;
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const hasInitialData = useCallback(() => hasInitialDataRef.current, []);

  return { isLoading, withLoading, hasInitialData };
} 