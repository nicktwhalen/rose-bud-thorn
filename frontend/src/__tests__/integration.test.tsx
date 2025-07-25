import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';
import History from '@/app/history/page';

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

// Mock the useEntryExists hook
jest.mock('@/hooks/useEntryExists', () => ({
  useEntryExists: jest.fn(() => ({
    exists: false,
    loading: false,
  })),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Set up localStorage with a test token for auth headers
    localStorage.setItem('token', 'test-jwt-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('completes full entry creation workflow', async () => {
    const user = userEvent.setup();

    // Mock successful API responses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        date: '2025-07-18',
        rose: 'Great weather',
        thorn: 'Long meeting',
        bud: 'Weekend plans',
      }),
    });

    render(<Home />);

    // Verify we're on the entry creation page
    expect(screen.getByText('Daily Reflection')).toBeInTheDocument();
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();

    // Fill out rose
    const roseTextarea = screen.getByPlaceholderText('Share something that made you smile today...');
    await user.type(roseTextarea, 'Great weather');

    // Navigate to thorn
    await user.click(screen.getByText('Next'));
    expect(screen.getByText('🌿 Your Thorn')).toBeInTheDocument();

    const thornTextarea = screen.getByPlaceholderText("It's okay to acknowledge the tough moments...");
    await user.type(thornTextarea, 'Long meeting');

    // Navigate to bud
    await user.click(screen.getByText('Next'));
    expect(screen.getByText('🌸 Your Bud')).toBeInTheDocument();

    const budTextarea = screen.getByPlaceholderText('What gives you hope for tomorrow?');
    await user.type(budTextarea, 'Weekend plans');

    // Submit form
    await user.click(screen.getByText('Complete Reflection'));

    // Verify API was called correctly
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/entries',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-jwt-token',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: expect.stringContaining('"rose":"Great weather"'),
        }),
      );
    });
  });

  it('handles navigation between steps correctly', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Start at step 1
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();

    // Previous button should be disabled
    const prevButton = screen.getByText('Previous');
    expect(prevButton).toHaveClass('cursor-not-allowed');

    // Go to step 2
    await user.click(screen.getByText('Next'));
    expect(screen.getByText('🌿 Your Thorn')).toBeInTheDocument();

    // Previous button should now be enabled
    expect(prevButton).not.toHaveClass('cursor-not-allowed');

    // Go back to step 1
    await user.click(prevButton);
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();

    // Previous button should be disabled again
    expect(prevButton).toHaveClass('cursor-not-allowed');
  });

  it('shows history page with entries', async () => {
    const mockEntries = [
      {
        id: 1,
        date: '2025-07-18',
        rose: 'Beautiful day',
        thorn: 'Traffic jam',
        bud: 'Family dinner',
        createdAt: '2025-07-18T10:00:00Z',
        updatedAt: '2025-07-18T10:00:00Z',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: mockEntries, total: 1 }),
    });

    render(<History />);

    // Should show loading initially
    expect(screen.getByText('Loading your reflections...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Friday, July 18, 2025')).toBeInTheDocument();
    });

    // Should show entry content
    expect(screen.getByText('Beautiful day')).toBeInTheDocument();
    expect(screen.getByText('Traffic jam')).toBeInTheDocument();
    expect(screen.getByText('Family dinner')).toBeInTheDocument();
  });

  it('handles form validation and encouragement', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Should show encouragement message
    expect(screen.getAllByText("Every day has something beautiful, even if it's small")[0]).toBeInTheDocument();

    // Can navigate through empty forms (fields are optional)
    await user.click(screen.getByText('Next'));
    expect(screen.getAllByText('Challenges help us grow and become stronger')[0]).toBeInTheDocument();

    await user.click(screen.getByText('Next'));
    expect(screen.getAllByText('Tomorrow holds new possibilities and opportunities')[0]).toBeInTheDocument();

    // Should show submit button on final step
    expect(screen.getByText('Complete Reflection')).toBeInTheDocument();
  });
});
