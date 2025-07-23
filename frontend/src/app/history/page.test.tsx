import { render, screen, waitFor } from '@testing-library/react';
import History from './page';
import { getLocalDateString } from '@/lib/dateUtils';

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      googleId: 'test-google-id',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock UserHeader and ProtectedRoute components
jest.mock('@/components/UserHeader', () => {
  return function MockUserHeader() {
    return <div data-testid="user-header">User Header</div>;
  };
});

jest.mock('@/components/ProtectedRoute', () => {
  return function MockProtectedRoute({ children }: { children: React.ReactNode }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('History Page', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<History />);

    expect(screen.getByText('Loading your reflections...')).toBeInTheDocument();
  });

  it('renders empty state when no entries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [], total: 0 }),
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText('No reflections yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Add Reflection')).toBeInTheDocument(); // Only one in header now
  });

  it('renders entries when data is available', async () => {
    const mockEntries = [
      {
        id: 1,
        date: '2025-07-18',
        rose: 'Beautiful sunset today',
        thorn: 'Traffic was terrible',
        bud: 'Looking forward to weekend',
        createdAt: '2025-07-18T10:00:00Z',
        updatedAt: '2025-07-18T10:00:00Z',
      },
      {
        id: 2,
        date: '2025-07-17',
        rose: 'Great coffee this morning',
        thorn: null,
        bud: 'New project starting',
        createdAt: '2025-07-17T09:00:00Z',
        updatedAt: '2025-07-17T09:00:00Z',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: mockEntries, total: 2 }),
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText('Friday, July 18, 2025')).toBeInTheDocument();
    });

    expect(screen.getByText('Thursday, July 17, 2025')).toBeInTheDocument();
    expect(screen.getByText('Beautiful sunset today')).toBeInTheDocument();
    expect(screen.getByText('Traffic was terrible')).toBeInTheDocument();
    expect(screen.getByText('Looking forward to weekend')).toBeInTheDocument();
    expect(screen.getByText('Great coffee this morning')).toBeInTheDocument();
    expect(screen.getByText('New project starting')).toBeInTheDocument();
  });

  it('shows today badge for current date entry', async () => {
    const today = getLocalDateString();

    const mockEntries = [
      {
        id: 1,
        date: today,
        rose: "Today's entry",
        thorn: null,
        bud: null,
        createdAt: `${today}T10:00:00Z`,
        updatedAt: `${today}T10:00:00Z`,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: mockEntries, total: 1 }),
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText('No reflections yet')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('renders navigation links', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [], total: 0 }),
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText('Add Reflection')).toBeInTheDocument(); // Only one in header now
    });

    expect(screen.getByText('Your Reflections')).toBeInTheDocument();
    expect(screen.getByText('A journey through your daily thoughts')).toBeInTheDocument();
  });

  it('shows click to view or edit message', async () => {
    const mockEntries = [
      {
        id: 1,
        date: '2025-07-18',
        rose: 'Test entry',
        thorn: null,
        bud: null,
        createdAt: '2025-07-18T10:00:00Z',
        updatedAt: '2025-07-18T10:00:00Z',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: mockEntries, total: 1 }),
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText('Click to view or edit')).toBeInTheDocument();
    });
  });
});
