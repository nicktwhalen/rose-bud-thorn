import { renderHook, waitFor } from '@testing-library/react';
import { useEntryExists, entryExistsCache } from './useEntryExists';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useEntryExists', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Clear cache between tests
    entryExistsCache.clear();
  });

  it('should return null when no date provided', () => {
    const { result } = renderHook(() => useEntryExists(''));

    expect(result.current.exists).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return true when entry exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const { result } = renderHook(() => useEntryExists('2025-07-18'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.exists).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/entries/2025-07-18', {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      signal: expect.any(AbortSignal),
    });
  });

  it('should return false when entry does not exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() => useEntryExists('2025-07-18'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.exists).toBe(false);
  });

  it('should return false when fetch throws error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEntryExists('2025-07-18'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.exists).toBe(false);
  });

  it('should update when date changes', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { result, rerender } = renderHook(({ date }) => useEntryExists(date), { initialProps: { date: '2025-07-18' } });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.exists).toBe(true);

    // Change date
    rerender({ date: '2025-07-19' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.exists).toBe(false);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(1, 'http://localhost:3001/api/entries/2025-07-18', {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      signal: expect.any(AbortSignal),
    });
    expect(mockFetch).toHaveBeenNthCalledWith(2, 'http://localhost:3001/api/entries/2025-07-19', {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      signal: expect.any(AbortSignal),
    });
  });
});
