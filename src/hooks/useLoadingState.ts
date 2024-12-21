import { useState, useCallback } from 'react';

export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  
  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    try {
      setIsLoading(true);
      await fn();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, withLoading };
} 