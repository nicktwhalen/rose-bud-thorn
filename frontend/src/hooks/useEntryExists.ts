import { useState, useEffect, useRef } from 'react';
import { getEntriesUrl, getAuthHeaders } from '@/lib/api';

// Cache to prevent duplicate requests for the same date
const entryExistsCache = new Map<string, { exists: boolean | null; loading: boolean; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

// Export cache for testing
export { entryExistsCache };

export function useEntryExists(date: string) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!date) {
      setExists(null);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = entryExistsCache.get(date);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log(`[useEntryExists] Cache hit for date: ${date}`);
      setExists(cached.exists);
      setLoading(cached.loading);
      return;
    }

    // Cancel any existing request for this hook instance
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }

    const checkEntry = async () => {
      console.log(`[useEntryExists] Making API request for date: ${date}`);

      // Update cache with loading state
      entryExistsCache.set(date, { exists: null, loading: true, timestamp: now });
      setLoading(true);
      setExists(null);

      // Create new abort controller for this request
      const controller = new AbortController();
      activeRequestRef.current = controller;

      try {
        const response = await fetch(getEntriesUrl(date), {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });

        const existsResult = response.ok;

        // Update cache with result
        entryExistsCache.set(date, { exists: existsResult, loading: false, timestamp: now });
        setExists(existsResult);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          // Update cache with failure result
          entryExistsCache.set(date, { exists: false, loading: false, timestamp: now });
          setExists(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          activeRequestRef.current = null;
        }
      }
    };

    checkEntry();

    // Cleanup function to abort request if component unmounts
    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    };
  }, [date]);

  return { exists, loading };
}
