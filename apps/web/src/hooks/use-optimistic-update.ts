import { useState, useCallback, useRef } from 'react';

interface OptimisticState<T> {
  data: T;
  isPending: boolean;
  error: Error | null;
}

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, previousData: T) => void;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * Hook for managing optimistic updates with automatic rollback on error
 * @param initialData - Initial state data
 * @param updateFn - Async function that performs the actual update
 * @param options - Configuration options
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>,
  options: OptimisticUpdateOptions<T> = {}
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isPending: false,
    error: null,
  });

  const previousDataRef = useRef<T>(initialData);
  const retryCountRef = useRef(0);

  const performUpdate = useCallback(
    async (optimisticData: T | ((prev: T) => T)) => {
      const newData =
        typeof optimisticData === 'function'
          ? (optimisticData as (prev: T) => T)(state.data)
          : optimisticData;

      // Store previous data for rollback
      previousDataRef.current = state.data;

      // Apply optimistic update immediately
      setState({
        data: newData,
        isPending: true,
        error: null,
      });

      try {
        // Perform the actual update
        const result = await updateFn(newData);

        // Success - update with server response
        setState({
          data: result,
          isPending: false,
          error: null,
        });

        options.onSuccess?.(result);
        retryCountRef.current = 0;

        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Update failed');

        // Check if we should retry
        const maxRetries = options.retryCount ?? 0;
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = options.retryDelay ?? 1000;

          // Retry after delay
          setTimeout(() => {
            performUpdate(newData);
          }, delay * retryCountRef.current);

          return newData;
        }

        // Rollback to previous data on error
        setState({
          data: previousDataRef.current,
          isPending: false,
          error: err,
        });

        options.onError?.(err, previousDataRef.current);
        retryCountRef.current = 0;

        throw err;
      }
    },
    [state.data, updateFn, options]
  );

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isPending: false,
      error: null,
    });
    retryCountRef.current = 0;
  }, [initialData]);

  return {
    data: state.data,
    isPending: state.isPending,
    error: state.error,
    update: performUpdate,
    reset,
  };
}

/**
 * Hook for managing optimistic updates on collections (arrays)
 */
export function useOptimisticCollection<T extends { id: string | number }>(
  initialItems: T[],
  updateFn: (items: T[]) => Promise<T[]>,
  options: OptimisticUpdateOptions<T[]> = {}
) {
  const {
    data: items,
    isPending,
    error,
    update,
    reset,
  } = useOptimisticUpdate(initialItems, updateFn, options);

  const updateItem = useCallback(
    (id: string | number, updates: Partial<T> | ((item: T) => T)) => {
      return update((prevItems) =>
        prevItems.map((item) =>
          item.id === id
            ? typeof updates === 'function'
              ? updates(item)
              : { ...item, ...updates }
            : item
        )
      );
    },
    [update]
  );

  const addItem = useCallback(
    (item: T) => {
      return update((prevItems) => [...prevItems, item]);
    },
    [update]
  );

  const removeItem = useCallback(
    (id: string | number) => {
      return update((prevItems) => prevItems.filter((item) => item.id !== id));
    },
    [update]
  );

  return {
    items,
    isPending,
    error,
    updateItem,
    addItem,
    removeItem,
    reset,
  };
}
