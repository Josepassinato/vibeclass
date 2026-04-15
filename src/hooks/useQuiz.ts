import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  video_id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
  question_order: number | null;
  difficulty: QuizDifficulty;
}

export interface QuizResult {
  passed: boolean;
  score_percentage: number;
  total_questions: number;
  correct_answers: number;
}

interface UseQuizOptions {
  videoId: string;
  studentId: string;
  passingScore?: number; // Percentage required to pass (default 70)
}

/**
 * Determine recommended difficulty based on student's past quiz performance.
 * - >80% average → hard
 * - <50% average → easy
 * - otherwise → medium
 */
async function getRecommendedDifficulty(studentId: string): Promise<QuizDifficulty> {
  try {
    const { data } = await supabase
      .from('student_quiz_results')
      .select('score_percentage')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false })
      .limit(5);

    if (!data || data.length === 0) return 'medium';

    const avg = data.reduce((sum, r) => sum + r.score_percentage, 0) / data.length;
    if (avg >= 80) return 'hard';
    if (avg < 50) return 'easy';
    return 'medium';
  } catch {
    return 'medium';
  }
}

/** Sort questions so that the recommended difficulty comes first, then adjacent. */
function sortByDifficulty(questions: QuizQuestion[], recommended: QuizDifficulty): QuizQuestion[] {
  const order: Record<QuizDifficulty, number> = { easy: 0, medium: 1, hard: 2 };
  const target = order[recommended];
  return [...questions].sort((a, b) => {
    const distA = Math.abs(order[a.difficulty ?? 'medium'] - target);
    const distB = Math.abs(order[b.difficulty ?? 'medium'] - target);
    return distA - distB;
  });
}

export const useQuiz = ({ videoId, studentId, passingScore = 70 }: UseQuizOptions) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [existingResult, setExistingResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recommendedDifficulty, setRecommendedDifficulty] = useState<QuizDifficulty>('medium');

  // Load quiz questions and existing result
  useEffect(() => {
    const loadQuizData = async () => {
      if (!videoId) return;

      setIsLoading(true);
      try {
        // Load questions - need to find video by youtube_id or uuid
        const { data: videoData } = await supabase
          .from('videos')
          .select('id')
          .or(`id.eq.${videoId},youtube_id.eq.${videoId}`)
          .single();

        const actualVideoId = videoData?.id || videoId;

        const { data: questionsData, error: questionsError } = await supabase
          .from('video_quizzes')
          .select('*')
          .eq('video_id', actualVideoId)
          .order('question_order', { ascending: true });

        if (questionsError) throw questionsError;

        // Parse options from JSONB
        const parsedQuestions: QuizQuestion[] = (questionsData || []).map(q => ({
          ...q,
          options: Array.isArray(q.options) ? q.options as string[] : [],
          difficulty: (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium') as QuizDifficulty,
        }));

        // Adaptive: sort questions by recommended difficulty
        const difficulty = await getRecommendedDifficulty(studentId);
        setRecommendedDifficulty(difficulty);
        const sorted = sortByDifficulty(parsedQuestions, difficulty);
        setQuestions(sorted);

        // Check for existing result
        const { data: resultData } = await supabase
          .from('student_quiz_results')
          .select('*')
          .eq('student_id', studentId)
          .eq('video_id', actualVideoId)
          .single();

        if (resultData) {
          setExistingResult({
            passed: resultData.passed,
            score_percentage: resultData.score_percentage,
            total_questions: resultData.total_questions,
            correct_answers: resultData.correct_answers,
          });
        }
      } catch (err) {
        console.error('Error loading quiz:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuizData();
  }, [videoId, studentId]);

  const currentQuestion = questions[currentQuestionIndex];
  const hasQuiz = questions.length > 0;
  const hasPassed = existingResult?.passed || result?.passed;

  const selectAnswer = useCallback((questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const submitQuiz = useCallback(async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Get actual video id
      const { data: videoData } = await supabase
        .from('videos')
        .select('id')
        .or(`id.eq.${videoId},youtube_id.eq.${videoId}`)
        .single();

      const actualVideoId = videoData?.id || videoId;

      // Calculate score
      let correctCount = 0;
      for (const question of questions) {
        const selectedAnswer = answers[question.id];
        const isCorrect = selectedAnswer === question.correct_option_index;
        
        if (isCorrect) correctCount++;

        // Save attempt
        await supabase.from('student_quiz_attempts').insert({
          student_id: studentId,
          video_id: actualVideoId,
          quiz_id: question.id,
          selected_option_index: selectedAnswer ?? -1,
          is_correct: isCorrect,
        });
      }

      const scorePercentage = Math.round((correctCount / questions.length) * 100);
      const passed = scorePercentage >= passingScore;

      const quizResult: QuizResult = {
        passed,
        score_percentage: scorePercentage,
        total_questions: questions.length,
        correct_answers: correctCount,
      };

      // Save result
      await supabase.from('student_quiz_results').upsert({
        student_id: studentId,
        video_id: actualVideoId,
        passed,
        score_percentage: scorePercentage,
        total_questions: questions.length,
        correct_answers: correctCount,
      }, {
        onConflict: 'student_id,video_id',
      });

      setResult(quizResult);
      setExistingResult(quizResult);
      setShowResults(true);
    } catch (err) {
      console.error('Error submitting quiz:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [videoId, studentId, questions, answers, passingScore, isSubmitting]);

  const resetQuiz = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResults(false);
    setResult(null);
  }, []);

  const isQuestionAnswered = (questionId: string) => answers[questionId] !== undefined;
  const allQuestionsAnswered = questions.every(q => isQuestionAnswered(q.id));

  return {
    questions,
    currentQuestion,
    currentQuestionIndex,
    answers,
    showResults,
    result,
    existingResult,
    isLoading,
    isSubmitting,
    hasQuiz,
    hasPassed,
    passingScore,
    recommendedDifficulty,
    selectAnswer,
    goToNextQuestion,
    goToPreviousQuestion,
    submitQuiz,
    resetQuiz,
    isQuestionAnswered,
    allQuestionsAnswered,
  };
};
