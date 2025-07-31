import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import { AuthUser } from '../../types/auth';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.location.href
delete (window as any).location;
(window as any).location = { href: '' };

const mockUser: AuthUser = {
  id: '123',
  googleId: 'google-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/photo.jpg',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

// Test component that uses AuthContext
function TestComponent() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{user ? user.name : 'no user'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not authenticated'}</div>
      <button onClick={() => login('test-token', mockUser)}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockFetch.mockClear();
    window.location.href = '';
    // Mock process.env
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  it('should render without crashing', () => {
    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>,
    );
  });

  it('should throw error when useAuth is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <div>
          <TestComponent />
        </div>,
      );
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should initialize with no user and set loading to false', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('no user');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not authenticated');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('user');
  });

  it('should restore user from localStorage on mount', async () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'test-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
  });

  it('should handle login correctly', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    act(() => {
      fireEvent.click(screen.getByText('Login'));
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
  });

  it('should handle logout with successful backend call', async () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'test-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Logged out successfully' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    expect(screen.getByTestId('user')).toHaveTextContent('no user');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not authenticated');
  });

  it('should handle logout with failed backend call', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'test-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error during logout:', expect.any(Error));
    });

    // Should still clear local storage and redirect even if backend call fails
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    expect(screen.getByTestId('user')).toHaveTextContent('no user');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not authenticated');

    consoleErrorSpy.mockRestore();
  });
});
