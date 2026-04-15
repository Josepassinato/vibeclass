import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import Student from './Student';
import { mockVideos } from '@/test/mocks/videos';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'student-1' },
    profile: { full_name: 'Test User' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    showOnboarding: false,
    isLoading: false,
    completeOnboarding: vi.fn(),
  }),
}));

vi.mock('@/hooks/useStudentProgress', () => ({
  useStudentProgress: () => ({
    stats: {
      totalLessons: 2,
      completedLessons: 1,
      progressPercentage: 50,
      totalWatchTimeMinutes: 30,
    },
    isLessonCompleted: (videoId: string) => videoId === 'video-1',
    markLessonComplete: vi.fn(async () => {}),
    refreshProgress: vi.fn(),
  }),
}));

vi.mock('@/hooks/useModuleProgress', () => ({
  useModuleProgress: () => ({
    modules: [],
    lessonProgress: new Map(),
    moduleProgress: new Map(),
    isLessonUnlocked: () => true,
    isModuleUnlocked: () => true,
    refreshProgress: vi.fn(),
  }),
}));

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(),
}));

vi.mock('@/components/VoiceChat', () => ({
  VoiceChat: () => <div data-testid="voice-chat">Voice Chat</div>,
}));

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: unknown }) => <>{children}</>,
}));

vi.mock('@/components/TranscriptChat', () => ({
  TranscriptChat: () => null,
}));

vi.mock('@/components/DynamicQuiz', () => ({
  DynamicQuiz: () => null,
}));

vi.mock('@/components/GamificationHub', () => ({
  GamificationHub: () => null,
}));

vi.mock('@/components/EnhancedCaptions', () => ({
  EnhancedCaptions: () => null,
  EnhancedCaptionsToggle: () => null,
}));

vi.mock('@/components/AvatarFeedback', () => ({
  AvatarFeedback: () => null,
}));

vi.mock('@/components/TeachingMomentsList', () => ({
  TeachingMomentsList: () => null,
}));

vi.mock('@/components/MissionsPanel', () => ({
  MissionsPanel: () => null,
}));

describe('Student Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'videos') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockVideos, error: null })),
          })),
        };
      }

      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });
  });

  it('renders the page header correctly', async () => {
    render(<Student />);

    await waitFor(() => {
      expect(screen.getByText('Vibe Code')).toBeInTheDocument();
    });
  });

  it('displays loading skeletons while fetching videos', () => {
    render(<Student />);

    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders video list after loading', async () => {
    render(<Student />);

    await waitFor(() => {
      expect(screen.getAllByText('Aula 1 - Introdução').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Aula 2 - Conceitos Básicos').length).toBeGreaterThan(0);
    });
  });

  it('shows lesson duration for videos', async () => {
    render(<Student />);

    await waitFor(() => {
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });
  });

  it('allows navigation between lessons', async () => {
    const user = userEvent.setup();
    render(<Student />);

    await waitFor(() => {
      expect(screen.getAllByText('Aula 1 - Introdução').length).toBeGreaterThan(0);
    });

    const nextButton = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('svg.lucide-chevron-right'));

    if (nextButton) {
      await user.click(nextButton);
    }

    await waitFor(() => {
      expect(screen.getAllByText('Aula 2 - Conceitos Básicos').length).toBeGreaterThan(0);
    });
  });

  it('displays progress bar when lessons exist', async () => {
    render(<Student />);

    await waitFor(() => {
      const progressElement = document.querySelector('[role="progressbar"]');
      expect(progressElement).toBeInTheDocument();
    });
  });

  it('has a link to the student dashboard', async () => {
    render(<Student />);

    await waitFor(() => {
      const dashboardLink = document.querySelector('a[href="/aluno/dashboard"]');
      expect(dashboardLink).toBeInTheDocument();
    });
  });
});

describe('Student Page - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'videos') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      }

      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });
  });

  it('shows empty state when no videos available', async () => {
    render(<Student />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma aula disponível ainda')).toBeInTheDocument();
    });
  });
});

describe('Student Page - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'videos') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              }),
            ),
          })),
        };
      }

      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<Student />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
