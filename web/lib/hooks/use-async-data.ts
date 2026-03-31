import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';

/**
 * Options for useAsyncData hook
 */
export interface UseAsyncDataOptions<T = unknown> {
  /**
   * Whether to fetch data immediately on mount (default: true)
   */
  enabled?: boolean;

  /**
   * Interval in milliseconds to automatically refetch data
   */
  refetchInterval?: number;

  /**
   * Callback when data fetch succeeds
   */
  onSuccess?: (data: T) => void;

  /**
   * Callback when data fetch fails
   */
  onError?: (error: Error) => void;
}

/**
 * Return type for useAsyncData hook
 */
export interface UseAsyncDataReturn<T> {
  /**
   * The fetched data (undefined while loading or if error occurred)
   */
  data: T | undefined;

  /**
   * Whether data is currently being fetched
   */
  isLoading: boolean;

  /**
   * Error object if fetch failed
   */
  error: Error | null;

  /**
   * Function to manually trigger a refetch
   */
  refetch: () => Promise<void>;
}

/**
 * Custom hook for async data fetching with loading/error states
 * 
 * @param fetcher - Async function that fetches the data
 * @param deps - Dependency array (like useEffect)
 * @param options - Configuration options
 * @returns Object with data, isLoading, error, and refetch function
 * 
 * @example
 * ```typescript
 * const { data, isLoading, error, refetch } = useAsyncData(
 *   () => fetch('/api/pets').then(r => r.json()),
 *   [tenantId],
 *   { refetchInterval: 30000, enabled: !!tenantId }
 * )
 * ```
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataReturn<T> {
  const {
    enabled = true,
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch function that updates state
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setData(result);
        setIsLoading(false);

        if (onSuccess) {
          onSuccess(result);
        }
      }
    } catch (err) {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);

        if (onError) {
          onError(error);
        }
      }
    }
  }, [fetcher, enabled, onSuccess, onError]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]);

  // Auto-refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalIdRef.current = setInterval(() => {
        fetchData();
      }, refetchInterval);

      return () => {
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
