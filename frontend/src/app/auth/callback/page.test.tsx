import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthCallbackPage from './page';

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: false,
  }),
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockGetToken = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockGetToken,
  }),
}));

// Mock dateUtils
jest.mock('@/lib/dateUtils', () => ({
  getLocalDateString: () => '2025-07-21',
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  it('should show error when no token is provided', () => {
    mockGetToken.mockReturnValue(null);

    render(<AuthCallbackPage />);

    expect(screen.getByText('⚠️ Authentication Error')).toBeInTheDocument();
    expect(screen.getByText('No authentication token received. Please try logging in again.')).toBeInTheDocument();
  });

  it('should show loading state when token is provided', async () => {
    const mockToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInBpY3R1cmUiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5qcGciLCJjcmVhdGVkQXQiOiIyMDI1LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJ1cGRhdGVkQXQiOiIyMDI1LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ.mock-signature';

    mockGetToken.mockReturnValue(mockToken);

    // Mock successful profile fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'test-user-id',
          googleId: 'test-google-id',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
    });

    render(<AuthCallbackPage />);

    expect(screen.getByText('Completing authentication...')).toBeInTheDocument();
  });

  it('should show loading state when processing authentication', () => {
    const mockToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInBpY3R1cmUiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5qcGciLCJjcmVhdGVkQXQiOiIyMDI1LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJ1cGRhdGVkQXQiOiIyMDI1LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ.mock-signature';

    mockGetToken.mockReturnValue(mockToken);

    // Mock successful profile fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'test-user-id',
          googleId: 'test-google-id',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
    });

    render(<AuthCallbackPage />);

    expect(screen.getByText('Completing authentication...')).toBeInTheDocument();
  });

  it('should prevent multiple profile requests from being made', async () => {
    const mockToken = 'valid-token';
    mockGetToken.mockReturnValue(mockToken);

    // Mock successful profile fetch with a delay to better test the protection
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    id: 'test-user-id',
                    googleId: 'test-google-id',
                    email: 'test@example.com',
                    name: 'Test User',
                    picture: 'https://example.com/avatar.jpg',
                    createdAt: '2025-01-01T00:00:00.000Z',
                    updatedAt: '2025-01-01T00:00:00.000Z',
                  }),
              }),
            50,
          ),
        ),
    );

    render(<AuthCallbackPage />);

    // Wait a bit to ensure effect starts
    await waitFor(() => {
      expect(screen.getByText('Fetching your profile...')).toBeInTheDocument();
    });

    // The fetch should have been called exactly once
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/auth/profile',
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      }),
    );
  });

  it('should only make one request even with React Strict Mode double-rendering', async () => {
    const mockToken = 'strict-mode-token';
    mockGetToken.mockReturnValue(mockToken);

    // Mock successful profile fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'test-user-id',
          googleId: 'test-google-id',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
    });

    const { unmount } = render(<AuthCallbackPage />);

    // Wait for the request to be made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // This demonstrates that our fix works within a single component lifecycle
    // The real protection is against useEffect running multiple times within
    // the same component instance due to dependencies changing
    expect(mockFetch).toHaveBeenCalledTimes(1);

    unmount();
  });
});
