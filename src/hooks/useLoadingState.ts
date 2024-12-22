import { useState, useRef, useEffect } from 'react';

export function useLoadingState() {
  const [isLoading, setIsLoading] = useState(false);
  const hasDataRef = useRef(false);
  const fetchCount = useRef(0);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const withLoading = async (fn: () => Promise<void>, showLoading = true) => {
    console.log('withLoading started');
    
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      await fn();
      console.log('withLoading fn completed');
      hasDataRef.current = true;
      fetchCount.current += 1;
    } catch (error) {
      console.error('Loading error:', error);
      throw error;
    } finally {
      console.log('withLoading finally block');
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    withLoading,
    hasInitialData: () => hasDataRef.current,
    getFetchCount: () => fetchCount.current
  };
}

