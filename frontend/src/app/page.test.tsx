import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';
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

// Note: useEntryExists is no longer used in the main page -
// we now check entry existence from /api/entries response to avoid 404s

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

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Home Page', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Set up localStorage with a test token for auth headers
    localStorage.setItem('token', 'test-jwt-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the main form elements', () => {
    render(<Home />);

    expect(screen.getByText('Daily Reflection')).toBeInTheDocument();
    expect(screen.getByText('Take a moment to reflect on your day')).toBeInTheDocument();
    expect(screen.getByLabelText('Select date for this reflection:')).toBeInTheDocument();
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows step indicators', () => {
    render(<Home />);

    // Should show 3 step indicators
    const stepIndicators = document.querySelectorAll('button[aria-label*="Go to step"]');
    expect(stepIndicators).toHaveLength(3);
  });

  it('navigates through steps correctly', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Should start at rose step
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();

    // Fill in rose and go to next step
    const textarea = screen.getByPlaceholderText('Share something that made you smile today...');
    await user.type(textarea, 'Beautiful sunset');

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Should be at thorn step
    expect(screen.getByText('🌿 Your Thorn')).toBeInTheDocument();

    // Go to next step
    const thornTextarea = screen.getByPlaceholderText("It's okay to acknowledge the tough moments...");
    await user.type(thornTextarea, 'Traffic was bad');
    await user.click(screen.getByText('Next'));

    // Should be at bud step
    expect(screen.getByText('🌸 Your Bud')).toBeInTheDocument();
    expect(screen.getByText('Complete Reflection')).toBeInTheDocument();
  });

  it('goes back to previous step', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Go to second step
    await user.click(screen.getByText('Next'));
    expect(screen.getByText('🌿 Your Thorn')).toBeInTheDocument();

    // Go back
    await user.click(screen.getByText('Previous'));
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();
  });

  it('disables previous button on first step', () => {
    render(<Home />);

    const prevButton = screen.getByText('Previous');
    expect(prevButton).toHaveClass('cursor-not-allowed');
  });

  it('submits form successfully', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    render(<Home />);

    // Fill out all steps
    await user.type(screen.getByPlaceholderText('Share something that made you smile today...'), 'Great weather');
    await user.click(screen.getByText('Next'));

    await user.type(screen.getByPlaceholderText("It's okay to acknowledge the tough moments..."), 'Long meeting');
    await user.click(screen.getByText('Next'));

    await user.type(screen.getByPlaceholderText('What gives you hope for tomorrow?'), 'Weekend plans');

    // Submit
    await user.click(screen.getByText('Complete Reflection'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/entries', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-jwt-token',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: expect.stringContaining(`"date":"${getLocalDateString()}"`),
      });
    });
  });

  it('allows date selection', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const dateInput = screen.getByLabelText('Select date for this reflection:');
    await user.clear(dateInput);
    await user.type(dateInput, '2025-07-15');

    expect(dateInput).toHaveValue('2025-07-15');
  });

  it('proceeds to next step when Enter is pressed in textarea', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Should start at rose step
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();

    // Type in textarea and press Enter
    const textarea = screen.getByPlaceholderText('Share something that made you smile today...');
    await user.type(textarea, 'Beautiful sunset{Enter}');

    // Should move to thorn step
    expect(screen.getByText('🌿 Your Thorn')).toBeInTheDocument();
  });

  it('submits form when Enter is pressed in final step textarea', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    render(<Home />);

    // Navigate to final step
    await user.click(screen.getByText('Next')); // to thorn
    await user.click(screen.getByText('Next')); // to bud

    expect(screen.getByText('🌸 Your Bud')).toBeInTheDocument();

    // Type in final textarea and press Enter to submit
    const budTextarea = screen.getByPlaceholderText('What gives you hope for tomorrow?');
    await user.type(budTextarea, 'Weekend plans{Enter}');

    // Should call submit
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('allows line breaks with Shift+Enter in textarea', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Should start at rose step
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();

    // Type in textarea and press Shift+Enter for line break
    const textarea = screen.getByPlaceholderText('Share something that made you smile today...');
    await user.type(textarea, 'Beautiful sunset{Shift>}{Enter}{/Shift}And great weather');

    // Should still be on rose step (not advanced)
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();

    // Should have line break in the text
    expect(textarea.value).toBe('Beautiful sunset\nAnd great weather');
  });
});
