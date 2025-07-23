import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewReflection from './page';

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User' },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: true,
  }),
}));

// Mock the useEntryExists hook
jest.mock('@/hooks/useEntryExists', () => ({
  useEntryExists: () => ({ exists: false, loading: false }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock dateUtils
jest.mock('@/lib/dateUtils', () => ({
  getLocalDateString: () => '2025-07-21',
}));

// Mock ProtectedRoute
jest.mock('@/components/ProtectedRoute', () => {
  return ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
});

// Mock UserHeader
jest.mock('@/components/UserHeader', () => {
  return () => <div data-testid="user-header">User Header</div>;
});

describe('NewReflection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the new reflection form', () => {
    render(<NewReflection />);
    
    expect(screen.getByText('Daily Reflection')).toBeInTheDocument();
    expect(screen.getByText('Take a moment to reflect on your day')).toBeInTheDocument();
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();
    expect(screen.getAllByText('What was the best part of your day?')).toHaveLength(2); // subtitle and label
  });

  it('should allow navigation between steps', () => {
    render(<NewReflection />);
    
    // Should start on first step
    expect(screen.getByText('🌹 Your Rose')).toBeInTheDocument();
    
    // Click next button
    fireEvent.click(screen.getByText('Next'));
    
    // Should be on second step
    expect(screen.getByText('🌿 Your Thorn')).toBeInTheDocument();
    expect(screen.getAllByText('What was challenging today?')).toHaveLength(2); // subtitle and label
  });

  it('should allow date selection', () => {
    render(<NewReflection />);
    
    const dateInput = screen.getByLabelText('Select date for this reflection:');
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveValue('2025-07-21');
    
    // Change date
    fireEvent.change(dateInput, { target: { value: '2025-07-20' } });
    expect(dateInput).toHaveValue('2025-07-20');
  });

  it('should show the final step with complete button', () => {
    render(<NewReflection />);
    
    // Navigate to final step
    fireEvent.click(screen.getByText('Next')); // To thorn
    fireEvent.click(screen.getByText('Next')); // To bud
    
    expect(screen.getByText('🌸 Your Bud')).toBeInTheDocument();
    expect(screen.getByText('Complete Reflection')).toBeInTheDocument();
  });
});