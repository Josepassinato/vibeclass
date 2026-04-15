export const mockVideos = [
  {
    id: 'video-1',
    youtube_id: 'test-yt-id-1',
    title: 'Aula 1 - Introdução',
    transcript: 'Este é o transcript da aula 1...',
    analysis: 'Análise da aula 1',
    thumbnail_url: 'https://img.youtube.com/vi/test-yt-id-1/hqdefault.jpg',
    lesson_order: 1,
    description: 'Descrição da aula introdutória',
    duration_minutes: 15,
    teaching_moments: [
      {
        timestamp_seconds: 30,
        topic: 'Conceito inicial',
        key_insight: 'Insight importante',
        questions_to_ask: ['Pergunta 1?'],
        discussion_points: ['Ponto de discussão'],
      },
    ],
    is_configured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'video-2',
    youtube_id: 'test-yt-id-2',
    title: 'Aula 2 - Conceitos Básicos',
    transcript: 'Este é o transcript da aula 2...',
    analysis: 'Análise da aula 2',
    thumbnail_url: 'https://img.youtube.com/vi/test-yt-id-2/hqdefault.jpg',
    lesson_order: 2,
    description: 'Descrição dos conceitos básicos',
    duration_minutes: 20,
    teaching_moments: [],
    is_configured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockStudentProgress = [
  {
    id: 'progress-1',
    student_id: 'test-student-id',
    video_id: 'video-1',
    is_completed: true,
    completed_at: new Date().toISOString(),
    last_position_seconds: 900,
    watch_time_seconds: 900,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockQuizQuestions = [
  {
    id: 'quiz-1',
    video_id: 'video-1',
    question: 'Qual é o principal conceito da aula?',
    options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
    correct_option_index: 0,
    explanation: 'A opção A é correta porque...',
    question_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'quiz-2',
    video_id: 'video-1',
    question: 'Qual alternativa melhor descreve o tema?',
    options: ['Alternativa 1', 'Alternativa 2', 'Alternativa 3', 'Alternativa 4'],
    correct_option_index: 2,
    explanation: 'A alternativa 3 é a correta.',
    question_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
