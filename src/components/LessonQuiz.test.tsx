import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { LessonQuiz } from './LessonQuiz';
import { mockQuizQuestions } from '@/test/mocks/videos';

const mockFrom = vi.fn();
const queryResult = <T,>(data: T, error: unknown = null) => Promise.resolve({ data, error });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/hooks/useContextualFeedback', () => ({
  useContextualFeedback: () => ({
    fetchFeedback: vi.fn(),
    getFeedback: vi.fn(() => null),
  }),
}));

const defaultProps = {
  videoId: 'video-1',
  studentId: 'student-1',
  onQuizComplete: vi.fn(),
  passingScore: 70,
};

function buildDefaultMocks(quizQuestions = mockQuizQuestions) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'videos') {
      return {
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            single: vi.fn(() => queryResult({ id: 'video-1' })),
          })),
        })),
      };
    }

    if (table === 'video_quizzes') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => queryResult(quizQuestions)),
          })),
        })),
      };
    }

    if (table === 'student_quiz_results') {
      return {
        select: vi.fn((columns?: string) => ({
          eq: vi.fn(() => {
            if (columns === 'score_percentage') {
              return {
                order: vi.fn(() => ({
                  limit: vi.fn(() => queryResult([])),
                })),
              };
            }

            return {
              eq: vi.fn(() => ({
                single: vi.fn(() => queryResult(null)),
              })),
            };
          }),
        })),
        upsert: vi.fn(() => queryResult(null)),
      };
    }

    if (table === 'student_quiz_attempts') {
      return {
        insert: vi.fn(() => queryResult(null)),
      };
    }

    return {
      select: vi.fn(() => queryResult([])),
    };
  });
}

describe('LessonQuiz Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildDefaultMocks();
  });

  it('shows loading state initially', () => {
    render(<LessonQuiz {...defaultProps} />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders quiz questions after loading', async () => {
    render(<LessonQuiz {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Qual é o principal conceito da aula?')).toBeInTheDocument();
    });
  });

  it('displays quiz progress indicator', async () => {
    render(<LessonQuiz {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });
  });

  it('allows selecting an answer', async () => {
    const user = userEvent.setup();
    render(<LessonQuiz {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Opção A')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Opção A'));

    const optionButton = screen.getByText('Opção A').closest('button');
    expect(optionButton).toHaveClass('ring-1');
  });

  it('navigates between questions', async () => {
    const user = userEvent.setup();
    render(<LessonQuiz {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Qual é o principal conceito da aula?')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Opção A'));
    await user.click(screen.getByText('Próxima'));

    await waitFor(() => {
      expect(screen.getByText('Qual alternativa melhor descreve o tema?')).toBeInTheDocument();
    });
  });

  it('calls onQuizComplete when quiz is approved and concluded', async () => {
    const onQuizComplete = vi.fn();
    const user = userEvent.setup();

    render(<LessonQuiz {...defaultProps} onQuizComplete={onQuizComplete} />);

    await waitFor(() => {
      expect(screen.getByText('Opção A')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Opção A'));
    await user.click(screen.getByText('Próxima'));

    await waitFor(() => {
      expect(screen.getByText('Alternativa 3')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Alternativa 3'));
    await user.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Concluir Aula' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Concluir Aula' }));

    expect(onQuizComplete).toHaveBeenCalledWith(true);
  });
});

describe('LessonQuiz - No Questions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildDefaultMocks([]);
  });

  it('shows message when no quiz available', async () => {
    render(<LessonQuiz videoId="video-1" studentId="student-1" onQuizComplete={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum quiz disponível para esta aula')).toBeInTheDocument();
    });
  });
});
