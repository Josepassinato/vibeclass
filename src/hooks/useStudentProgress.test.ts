import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@/test/utils';
import { useStudentProgress } from './useStudentProgress';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

describe('useStudentProgress Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => 'test-student-id'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    mockFrom.mockImplementation((table: string) => {
      if (table === 'videos') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ 
              data: [{ id: 'video-1' }, { id: 'video-2' }], 
              error: null 
            })),
          })),
        };
      }
      if (table === 'student_lesson_progress') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ 
              data: [
                { video_id: 'video-1', is_completed: true, watch_time_seconds: 600 }
              ], 
              error: null 
            })),
          })),
          upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        };
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });
  });

  it('initializes with default stats', () => {
    const { result } = renderHook(() => useStudentProgress());
    
    expect(result.current.stats).toEqual({
      totalLessons: 0,
      completedLessons: 0,
      progressPercentage: 0,
      totalWatchTimeMinutes: 0,
    });
  });

  it('loads progress and calculates stats', async () => {
    const { result } = renderHook(() => useStudentProgress());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.stats.totalLessons).toBe(2);
      expect(result.current.stats.completedLessons).toBe(1);
      expect(result.current.stats.progressPercentage).toBe(50);
    });
  });

  it('correctly identifies completed lessons', async () => {
    const { result } = renderHook(() => useStudentProgress());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLessonCompleted('video-1')).toBe(true);
    expect(result.current.isLessonCompleted('video-2')).toBe(false);
  });

  it('provides markLessonComplete function', async () => {
    const { result } = renderHook(() => useStudentProgress());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.markLessonComplete).toBe('function');
  });

  it('provides refreshProgress function', async () => {
    const { result } = renderHook(() => useStudentProgress());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refreshProgress).toBe('function');
  });

  it('calls onProgressUpdate callback when stats change', async () => {
    const onProgressUpdate = vi.fn();
    
    renderHook(() => useStudentProgress({ onProgressUpdate }));
    
    await waitFor(() => {
      expect(onProgressUpdate).toHaveBeenCalled();
    });
  });
});

describe('useStudentProgress - No Student ID', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage with no stored ID
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  it('generates a new student ID if none exists', async () => {
    const { result } = renderHook(() => useStudentProgress());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(window.localStorage.setItem).toHaveBeenCalled();
  });
});
