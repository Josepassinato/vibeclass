import { vi } from 'vitest';

// Mock user for testing
export const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: { full_name: 'Test User' },
};

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

export const mockProfile = {
  id: 'profile-id-123',
  user_id: 'test-user-id-123',
  full_name: 'Test User',
  avatar_url: null,
};

// Mock useAuth hook return values
export const mockAuthAuthenticated = {
  user: mockUser,
  session: mockSession,
  profile: mockProfile,
  isLoading: false,
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue({ error: null }),
};

export const mockAuthUnauthenticated = {
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue({ error: null }),
};

export const mockAuthLoading = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
};

// Helper to mock useAuth in tests
export const createAuthMock = (state: 'authenticated' | 'unauthenticated' | 'loading' = 'authenticated') => {
  switch (state) {
    case 'authenticated':
      return mockAuthAuthenticated;
    case 'unauthenticated':
      return mockAuthUnauthenticated;
    case 'loading':
      return mockAuthLoading;
  }
};
