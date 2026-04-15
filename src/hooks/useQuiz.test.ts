import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuiz } from './useQuiz';

// The supabase mock from setup.ts returns empty arrays by default.
// These tests focus on client-side logic that doesn't depend on loaded data.

describe('useQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should finish loading and report no quiz', async () => {
    const { result } = renderHook(() => useQuiz({ videoId: 'v1', studentId: 's1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasQuiz).toBe(false);
    expect(result.current.questions).toEqual([]);
  });

  it('should select answer for a question', async () => {
    const { result } = renderHook(() => useQuiz({ videoId: 'v1', studentId: 's1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.selectAnswer('q1', 2));
    expect(result.current.answers['q1']).toBe(2);
    expect(result.current.isQuestionAnswered('q1')).toBe(true);
    expect(result.current.isQuestionAnswered('q2')).toBe(false);
  });

  it('should navigate (clamped to bounds)', async () => {
    const { result } = renderHook(() => useQuiz({ videoId: 'v1', studentId: 's1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // With empty questions, index should stay at 0
    expect(result.current.currentQuestionIndex).toBe(0);
    act(() => result.current.goToNextQuestion());
    expect(result.current.currentQuestionIndex).toBe(0);
    act(() => result.current.goToPreviousQuestion());
    expect(result.current.currentQuestionIndex).toBe(0);
  });

  it('should reset quiz state', async () => {
    const { result } = renderHook(() => useQuiz({ videoId: 'v1', studentId: 's1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.selectAnswer('q1', 0));
    expect(Object.keys(result.current.answers).length).toBe(1);

    act(() => result.current.resetQuiz());
    expect(result.current.currentQuestionIndex).toBe(0);
    expect(Object.keys(result.current.answers).length).toBe(0);
    expect(result.current.showResults).toBe(false);
    expect(result.current.result).toBeNull();
  });

  it('should default passingScore to 70', () => {
    const { result } = renderHook(() => useQuiz({ videoId: 'v1', studentId: 's1' }));
    expect(result.current.passingScore).toBe(70);
  });

  it('should accept custom passingScore', () => {
    const { result } = renderHook(() => useQuiz({ videoId: 'v1', studentId: 's1', passingScore: 80 }));
    expect(result.current.passingScore).toBe(80);
  });
});
