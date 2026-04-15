import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import App from './App';

// Mock all page components
vi.mock('./pages/Admin', () => ({
  default: () => <div data-testid="admin-page">Admin Page</div>,
}));

vi.mock('./pages/Student', () => ({
  default: () => <div data-testid="student-page">Student Page</div>,
}));

vi.mock('./pages/StudentDashboard', () => ({
  default: () => <div data-testid="student-dashboard">Student Dashboard</div>,
}));

vi.mock('./pages/NotFound', () => ({
  default: () => <div data-testid="not-found">Not Found</div>,
}));

vi.mock('./components/DebugPanel', () => ({
  default: () => null,
}));

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoading: false,
  }),
}));

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects root path to /aluno', async () => {
    render(<App />, { withRouter: false });
    
    await waitFor(() => {
      expect(screen.getByTestId('student-page')).toBeInTheDocument();
    });
  });
});

describe('App Navigation', () => {
  it('renders the app without crashing', () => {
    render(<App />, { withRouter: false });
    // If it renders, the test passes
    expect(document.body).toBeDefined();
  });
});
