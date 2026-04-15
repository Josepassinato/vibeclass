// ============================================================
// Vibe Class — MongoDB Full Rebuild
// Generated: 2026-03-31
// Drops and recreates vibe_class with:
//   - Schema validation for all 21 collections
//   - Proper indexes
//   - Correct seed data (Supabase-aligned + expanded modules)
// ============================================================

const DB_NAME = "vibe_class";
db = db.getSiblingDB(DB_NAME);

print("=== DROPPING existing vibe_class database ===");
db.dropDatabase();
db = db.getSiblingDB(DB_NAME);

// ============================================================
// 1. MODULES
// ============================================================
print("Creating: modules");
db.createCollection("modules", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "module_order"],
      properties: {
        title: { bsonType: "string" },
        description: { bsonType: "string" },
        module_order: { bsonType: "int" },
        thumbnail_url: { bsonType: "string" },
        is_released: { bsonType: "bool" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.modules.createIndex({ module_order: 1 }, { unique: true });

// ============================================================
// 2. VIDEOS
// ============================================================
print("Creating: videos");
db.createCollection("videos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title"],
      properties: {
        title: { bsonType: "string" },
        youtube_id: { bsonType: "string" },
        transcript: { bsonType: "string" },
        analysis: { bsonType: "string" },
        thumbnail_url: { bsonType: "string" },
        lesson_order: { bsonType: "int" },
        description: { bsonType: "string" },
        duration_minutes: { bsonType: "int" },
        teaching_moments: { bsonType: "array" },
        is_configured: { bsonType: "bool" },
        is_released: { bsonType: "bool" },
        teacher_intro: { bsonType: "string" },
        video_url: { bsonType: "string" },
        video_type: { enum: ["youtube", "direct", "external"] },
        module_id: { bsonType: "objectId" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.videos.createIndex({ module_id: 1, lesson_order: 1 });
db.videos.createIndex({ lesson_order: 1 });
db.videos.createIndex({ youtube_id: 1 }, { sparse: true });

// ============================================================
// 3. VIDEO_QUIZZES
// ============================================================
print("Creating: video_quizzes");
db.createCollection("video_quizzes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["video_id", "question", "options", "correct_option_index"],
      properties: {
        video_id: { bsonType: "objectId" },
        question: { bsonType: "string" },
        options: { bsonType: "array" },
        correct_option_index: { bsonType: "int" },
        explanation: { bsonType: "string" },
        question_order: { bsonType: "int" },
        timestamp_seconds: { bsonType: "int" },
        difficulty: { enum: ["easy", "medium", "hard"] },
        question_type: { enum: ["multiple_choice", "open"] },
        rubric: { bsonType: "string" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.video_quizzes.createIndex({ video_id: 1 });

// ============================================================
// 4. MISSIONS
// ============================================================
print("Creating: missions");
db.createCollection("missions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "description", "instructions"],
      properties: {
        title: { bsonType: "string" },
        description: { bsonType: "string" },
        instructions: { bsonType: "string" },
        video_id: { bsonType: "objectId" },
        evidence_type: { enum: ["text", "screenshot", "code", "link", "file"] },
        difficulty_level: { enum: ["básico", "intermediário", "avançado"] },
        points_reward: { bsonType: "int" },
        time_limit_minutes: { bsonType: "int" },
        evaluation_criteria: { bsonType: "array" },
        is_active: { bsonType: "bool" },
        mission_order: { bsonType: "int" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.missions.createIndex({ video_id: 1 });
db.missions.createIndex({ is_active: 1 });

// ============================================================
// 5. STUDENT_PROFILES
// ============================================================
print("Creating: student_profiles");
db.createCollection("student_profiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id"],
      properties: {
        student_id: { bsonType: "string" },
        name: { bsonType: "string" },
        learning_style: { enum: ["visual", "auditivo", "cinestésico", "leitura"] },
        emotional_patterns: { bsonType: "array" },
        strengths: { bsonType: "array" },
        areas_to_improve: { bsonType: "array" },
        preferences: { bsonType: "object" },
        personality_notes: { bsonType: "string" },
        interaction_count: { bsonType: "int" },
        total_study_time_minutes: { bsonType: "int" },
        last_seen_at: { bsonType: "date" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.student_profiles.createIndex({ student_id: 1 }, { unique: true });
db.student_profiles.createIndex({ last_seen_at: -1 });

// ============================================================
// 6. STUDENT_OBSERVATIONS
// ============================================================
print("Creating: student_observations");
db.createCollection("student_observations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id", "observation_type", "observation_data"],
      properties: {
        student_id: { bsonType: "string" },
        video_id: { bsonType: "objectId" },
        observation_type: { enum: ["emotion", "comprehension", "engagement", "behavior"] },
        observation_data: { bsonType: "object" },
        emotional_state: { enum: ["happy", "confused", "frustrated", "excited", "bored", "focused"] },
        confidence_level: { bsonType: "double" },
        context: { bsonType: "string" },
        created_at: { bsonType: "date" }
      }
    }
  }
});
db.student_observations.createIndex({ student_id: 1 });
db.student_observations.createIndex({ created_at: -1 });

// ============================================================
// 7. STUDENT_LESSON_PROGRESS
// ============================================================
print("Creating: student_lesson_progress");
db.createCollection("student_lesson_progress", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id", "video_id"],
      properties: {
        student_id: { bsonType: "string" },
        video_id: { bsonType: "objectId" },
        completed_at: { bsonType: "date" },
        watch_time_seconds: { bsonType: "int" },
        last_position_seconds: { bsonType: "int" },
        is_completed: { bsonType: "bool" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.student_lesson_progress.createIndex({ student_id: 1, video_id: 1 }, { unique: true });

// ============================================================
// 8. STUDENT_QUIZ_ATTEMPTS
// ============================================================
print("Creating: student_quiz_attempts");
db.createCollection("student_quiz_attempts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id", "video_id", "quiz_id", "selected_option_index", "is_correct"],
      properties: {
        student_id: { bsonType: "string" },
        video_id: { bsonType: "objectId" },
        quiz_id: { bsonType: "objectId" },
        selected_option_index: { bsonType: "int" },
        is_correct: { bsonType: "bool" },
        attempted_at: { bsonType: "date" }
      }
    }
  }
});
db.student_quiz_attempts.createIndex({ student_id: 1, quiz_id: 1 });

// ============================================================
// 9. STUDENT_QUIZ_RESULTS
// ============================================================
print("Creating: student_quiz_results");
db.createCollection("student_quiz_results", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id", "video_id"],
      properties: {
        student_id: { bsonType: "string" },
        video_id: { bsonType: "objectId" },
        passed: { bsonType: "bool" },
        score_percentage: { bsonType: "int" },
        total_questions: { bsonType: "int" },
        correct_answers: { bsonType: "int" },
        completed_at: { bsonType: "date" }
      }
    }
  }
});
db.student_quiz_results.createIndex({ student_id: 1, video_id: 1 }, { unique: true });

// ============================================================
// 10. STUDENT_OPEN_ANSWERS
// ============================================================
print("Creating: student_open_answers");
db.createCollection("student_open_answers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id", "video_id", "quiz_id", "answer_text"],
      properties: {
        student_id: { bsonType: "string" },
        video_id: { bsonType: "objectId" },
        quiz_id: { bsonType: "objectId" },
        answer_text: { bsonType: "string" },
        attempt_number: { bsonType: "int" },
        score: { bsonType: "double" },
        ai_feedback: { bsonType: "string" },
        strengths: { bsonType: "string" },
        improvements: { bsonType: "string" },
        submitted_at: { bsonType: "date" },
        evaluated_at: { bsonType: "date" }
      }
    }
  }
});
db.student_open_answers.createIndex({ student_id: 1, quiz_id: 1 });

// ============================================================
// 11. STUDENT_MISSION_SUBMISSIONS
// ============================================================
print("Creating: student_mission_submissions");
db.createCollection("student_mission_submissions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["mission_id", "student_id"],
      properties: {
        mission_id: { bsonType: "objectId" },
        student_id: { bsonType: "string" },
        evidence_text: { bsonType: "string" },
        evidence_url: { bsonType: "string" },
        status: { enum: ["pending", "evaluating", "approved", "needs_revision", "rejected"] },
        ai_evaluation: { bsonType: "object" },
        ai_feedback: { bsonType: "string" },
        score: { bsonType: "int" },
        attempt_number: { bsonType: "int" },
        submitted_at: { bsonType: "date" },
        evaluated_at: { bsonType: "date" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.student_mission_submissions.createIndex({ mission_id: 1 });
db.student_mission_submissions.createIndex({ student_id: 1 });
db.student_mission_submissions.createIndex({ status: 1 });

// ============================================================
// 12. STUDENT_ACHIEVEMENTS
// ============================================================
print("Creating: student_achievements");
db.createCollection("student_achievements", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id"],
      properties: {
        student_id: { bsonType: "string" },
        total_points: { bsonType: "int" },
        current_streak: { bsonType: "int" },
        longest_streak: { bsonType: "int" },
        level: { bsonType: "int" },
        badges: { bsonType: "array" },
        missions_completed: { bsonType: "int" },
        missions_attempted: { bsonType: "int" },
        average_score: { bsonType: "double" },
        last_activity_at: { bsonType: "date" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.student_achievements.createIndex({ student_id: 1 }, { unique: true });

// ============================================================
// 13. STUDENT_XP
// ============================================================
print("Creating: student_xp");
db.createCollection("student_xp", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id"],
      properties: {
        student_id: { bsonType: "string" },
        total_xp: { bsonType: "int" },
        level: { bsonType: "int" },
        current_streak_days: { bsonType: "int" },
        longest_streak_days: { bsonType: "int" },
        last_study_date: { bsonType: "date" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.student_xp.createIndex({ student_id: 1 }, { unique: true });
db.student_xp.createIndex({ total_xp: -1 }); // leaderboard

// ============================================================
// 14. SQUADS
// ============================================================
print("Creating: squads");
db.createCollection("squads", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name"],
      properties: {
        name: { bsonType: "string" },
        is_active: { bsonType: "bool" },
        max_members: { bsonType: "int" },
        current_members: { bsonType: "int" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

// ============================================================
// 15. SQUAD_MEMBERS
// ============================================================
print("Creating: squad_members");
db.createCollection("squad_members", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["squad_id", "user_id"],
      properties: {
        squad_id: { bsonType: "objectId" },
        user_id: { bsonType: "string" },
        role: { enum: ["leader", "member"] },
        joined_at: { bsonType: "date" }
      }
    }
  }
});
db.squad_members.createIndex({ user_id: 1 }, { unique: true });
db.squad_members.createIndex({ squad_id: 1 });

// ============================================================
// 16. SQUAD_MISSION_SUBMISSIONS
// ============================================================
print("Creating: squad_mission_submissions");
db.createCollection("squad_mission_submissions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["squad_id", "mission_id", "submitted_by"],
      properties: {
        squad_id: { bsonType: "objectId" },
        mission_id: { bsonType: "objectId" },
        submitted_by: { bsonType: "string" },
        evidence_text: { bsonType: "string" },
        evidence_url: { bsonType: "string" },
        status: { enum: ["pending", "evaluated"] },
        ai_feedback: { bsonType: "string" },
        ai_evaluation: { bsonType: "object" },
        score: { bsonType: "int" },
        submitted_at: { bsonType: "date" },
        evaluated_at: { bsonType: "date" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.squad_mission_submissions.createIndex({ squad_id: 1, mission_id: 1 });

// ============================================================
// 17. CERTIFICATES
// ============================================================
print("Creating: certificates");
db.createCollection("certificates", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id", "student_name", "certificate_code"],
      properties: {
        student_id: { bsonType: "string" },
        module_id: { bsonType: "objectId" },
        certificate_type: { enum: ["module", "course"] },
        student_name: { bsonType: "string" },
        module_title: { bsonType: "string" },
        certificate_code: { bsonType: "string" },
        issued_at: { bsonType: "date" },
        created_at: { bsonType: "date" }
      }
    }
  }
});
db.certificates.createIndex({ student_id: 1 });
db.certificates.createIndex({ certificate_code: 1 }, { unique: true });

// ============================================================
// 18. TRANSCRIPT_EMBEDDINGS
// ============================================================
print("Creating: transcript_embeddings");
db.createCollection("transcript_embeddings", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["video_id", "chunk_text", "chunk_index"],
      properties: {
        video_id: { bsonType: "objectId" },
        chunk_text: { bsonType: "string" },
        chunk_index: { bsonType: "int" },
        embedding: { bsonType: "array" },
        metadata: { bsonType: "object" },
        created_at: { bsonType: "date" }
      }
    }
  }
});
db.transcript_embeddings.createIndex({ video_id: 1 });

// ============================================================
// 19. PROFILES (user profiles)
// ============================================================
print("Creating: profiles");
db.createCollection("profiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id"],
      properties: {
        user_id: { bsonType: "string" },
        full_name: { bsonType: "string" },
        avatar_url: { bsonType: "string" },
        email: { bsonType: "string" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.profiles.createIndex({ user_id: 1 }, { unique: true });

// ============================================================
// 20. USER_ROLES
// ============================================================
print("Creating: user_roles");
db.createCollection("user_roles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "role"],
      properties: {
        user_id: { bsonType: "string" },
        role: { enum: ["admin", "student"] },
        created_at: { bsonType: "date" }
      }
    }
  }
});
db.user_roles.createIndex({ user_id: 1, role: 1 }, { unique: true });

// ============================================================
// 21. USERS (auth users — local auth if needed)
// ============================================================
print("Creating: users");
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email"],
      properties: {
        email: { bsonType: "string" },
        password_hash: { bsonType: "string" },
        provider: { enum: ["email", "google", "github"] },
        email_verified: { bsonType: "bool" },
        last_sign_in: { bsonType: "date" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.users.createIndex({ email: 1 }, { unique: true });

// ============================================================
// SEED DATA
// ============================================================
print("\n=== INSERTING SEED DATA ===\n");

const now = new Date();

// --- MODULES (10) ---
print("Seeding: modules (10)");
const modules = db.modules.insertMany([
  { title: "Fundamentos do Empreendedor Vibe", description: "Mindset empreendedor, oportunidades com IA e introdução ao ecossistema Google.", module_order: NumberInt(1), is_released: true, created_at: now, updated_at: now },
  { title: "Seu Ambiente Google", description: "Configuração do AI Studio, Firebase Studio e domínio do Gemini.", module_order: NumberInt(2), is_released: false, created_at: now, updated_at: now },
  { title: "Construindo seu SaaS", description: "Desenvolvimento com Flutter, autenticação, Firestore e integrações.", module_order: NumberInt(3), is_released: false, created_at: now, updated_at: now },
  { title: "Lançamento", description: "Deploy, Vertex AI em produção e projeto final.", module_order: NumberInt(4), is_released: false, created_at: now, updated_at: now },
  { title: "Fundamentos de Modelos de IA", description: "Panorama de LLMs, embeddings, fine-tuning e arquitetura Transformer.", module_order: NumberInt(5), is_released: false, created_at: now, updated_at: now },
  { title: "RAG: Retrieval-Augmented Generation", description: "Chunking, vector search, agentic RAG e RAG sobre mídia.", module_order: NumberInt(6), is_released: false, created_at: now, updated_at: now },
  { title: "MCP: Model Context Protocol", description: "Arquitetura MCP, servidores, multi-agent e shared memory.", module_order: NumberInt(7), is_released: false, created_at: now, updated_at: now },
  { title: "Agentes Autônomos", description: "LangGraph, CrewAI, governança e projeto de agente completo.", module_order: NumberInt(8), is_released: false, created_at: now, updated_at: now },
  { title: "Deploy e Infraestrutura", description: "VPS, Docker, CI/CD, monitoramento e deploy completo.", module_order: NumberInt(9), is_released: false, created_at: now, updated_at: now },
  { title: "Produto e Monetização", description: "Modelos de negócio, pagamentos, growth, onboarding e MVP.", module_order: NumberInt(10), is_released: false, created_at: now, updated_at: now }
]);

const modIds = modules.insertedIds;
print("  Inserted " + Object.keys(modIds).length + " modules");

// --- VIDEOS (Module 1: 5 real videos with transcripts) ---
print("Seeding: videos (Module 1 — 5 with transcripts)");

const mod1Id = modIds[0];

const v1 = db.videos.insertOne({
  title: "Introdução",
  youtube_id: "-8e3EH41qHQ",
  lesson_order: NumberInt(1),
  module_id: mod1Id,
  is_configured: true,
  is_released: true,
  description: "Introdução ao curso — código é commodity, seu julgamento é o ativo raro.",
  video_type: "youtube",
  teaching_moments: [],
  transcript: "agora. Quantas estão abertas? Olhe para o seu celular. Quantos aplicativos estão instalados? Centenas. Mas a verdade é que o mundo digital virou um cemitério de boas intenções. Por quê? Porque na última década nós ensinamos as pessoas a programar, mas esquecemos de ensiná-las a sentir. Hoje não vamos falar de Python, não vamos falar de APIs complexas. Se você veio aqui esperando ver linhas de código nesta primeira aula, você pode fechar o vídeo. O código é a parte fácil. A inteligência artificial escreve código melhor e mais rápido do que qualquer humano. O código virou commodity, mas existe algo que a IA não tem julgamento. Você não está aqui para ser um usuário de ferramentas. Você não está aqui para ser um digitador de prompts. Você está aqui para ser um intérprete de dor. Um produto de tecnologia não é um amontoado de funções. É uma ponte, uma ponte invisível entre a dor de alguém e a sua paz. Você criou um produto. Nós estamos vivendo a maior mudança da nossa geração com a IA. A barreira de construção caiu para zero. Mas isso cria um perigo. A inundação de lixo digital. Como você se destaca? Tendo a sensibilidade que a máquina não tem. Código é commodity. O seu julgamento é o ativo raro. Vamos começar.",
  created_at: now, updated_at: now
});

const v2 = db.videos.insertOne({
  title: "Aula 1: Descobrindo a Dor",
  youtube_id: "Pp-7DJZMSBA",
  lesson_order: NumberInt(2),
  module_id: mod1Id,
  is_configured: true,
  is_released: true,
  description: "Aula 1 — Vitaminas vs Analgésicos, Hook Model, framework dos 12 minutos.",
  video_type: "youtube",
  teaching_moments: [],
  transcript: "Vamos começar o nosso primeiro mergulho. O erro fatal que mata 90% das ideias não é a falta de tecnologia, é a paixão pela solução. Você tem uma ideia, desenha, monta e ninguém usa. Por quê? Porque você construiu uma solução procurando um problema. Na 12 Brain, eu quero que você se apaixone pelo problema. Você é um detetive. Sua lupa é a empatia. Para entender isso, vamos usar a analogia de vitaminas e analgésicos. Vitaminas são nice to have. É legal tomar, mas se você esquecer, a vida segue. Analgésicos são must have. Se você acorda às 3 da manhã com dor de dente, você vai à farmácia de pijama. Você paga o preço que for. A dor é urgente. Muitos acham que precisam criar o próximo Uber. Esqueçam isso. Às vezes o melhor analgésico é invisível. Pense num grupo de WhatsApp de voluntários da igreja. Tentar marcar uma escala ali é um inferno. Se você cria um agente simples que organiza a lista sozinho no privado, você criou um analgésico. Você removeu o caos. Outro exemplo, o mundo corporativo está cheio de dor passiva. Sabe aquele processo onde você precisa copiar dados de um e-mail e colar num sistema antigo? todo dia. Isso é uma tortura lenta. Se você cria uma automação que faz isso sozinha, você devolveu tempo de vida para aquele funcionário. Isso é poder. Como identificar essas dores? Existem três tipos. A dor latente que o usuário tem, mas não sabe. A dor passiva que ele já desistiu de resolver e a dor ativa onde ele está desesperado. Use o Gemini ou o chat GPT para simular essas dores. Peça para a IA listar o que tira o sono do seu cliente. Pare de tentar impressionar com tecnologia. Impressione resolvendo problemas reais. Identificamos a dor. Agora, como garantimos que a solução seja usada? Vamos adaptar o modelo do gancho para a realidade do agente no Code. Gatilho, ação, recompensa e investimento. Primeiro, o gatilho. Os maiores produtos usam gatilhos internos, emoções. Quando um cliente seu tem uma dúvida sobre o contrato, o gatilho é a insegurança. Se você demora para responder, a insegurança aumenta. Como agente cria um sistema onde essa insegurança dispara uma resposta imediata e acolhedora da sua IA. A IA não espera, ela antecipa. Segundo a ação. A regra é: quanto mais difícil, menos uso. Estamos caminhando para zero UI. Imagine um dono de mercadinho que odeia computador. A ação para ele tem que ser mandar um áudio no WhatsApp dizendo: Vendi três caixas de leite. e o seu agente processa. Se você reduz o atrito a zero, você vence. Terceiro, a recompensa variável. Por que as redes sociais viciam? Surpresa. Traga isso para o seu sistema. Se você criou um painel de vendas, faça a IA trazer um insite diferente todo dia. Hoje você vendeu 20% a mais. O usuário abre o sistema para ver o que a IA descobriu, não por obrigação. Quarto, o investimento. Quanto mais a pessoa usa, melhor o produto fica. Se você cria um aplicativo de diário ou orações, as memórias ficam lá. Como agente, garanta que o sistema aprenda. Se eu corrijo a IA uma vez, ela nunca mais deve errar. Você não precisa de milhões de usuários. Se tiver 10 que amam sua solução, você venceu. Vocês entendem a dor e o hábito. Agora, como construímos? O erro é achar que leva meses. Tempo é o único recurso que não volta. Por isso, usamos o framework dos 12 minutos. A restrição gera foco. Código é commodity. O que eu quero de vocês nesses 12 minutos é a arquitetura. Bloco um, minutos 0 a 4. A definição da dor única. Escreva em uma frase: Não vale, vou melhorar a gestão. Vago demais. Tem que ser. Vou eliminar o tempo que a equipe gasta preenchendo relatórios manuais na sexta à tarde. Isso é específico. Isso é dor real. Bloco dois, minutos 4 a 8, o caminho feliz. Desenhe em papel de pão. Passo um, vendedor manda áudio. Passo dois, IA transcreve. Passo três, chefe recebe e-mail. Pronto. Se você desenhou 10 telas e menus de login, você está pensando como programador antigo. Pense como agente de solução. Bloco 3, minutos 8 a 12. O aha moment. Qual é o momento em que o usuário sorri? é quando ele recebe a notificação de feito sem ter tido trabalho. Estamos buscando o MLP, produto mínimo amável. Uma planilha automatizada que poupa 2 horas é mais amável do que um aplicativo complexo. Se não consegue desenhar em 12 minutos, volte e observe mais. Estamos chegando ao fim. Começamos falando de almas e terminamos falando de estratégia rápida. Quero reforçar. A tecnologia sem humanidade é apenas burocracia digital. Sua missão hoje não é abrir o computador e programar. Sua missão é observar. Nas próximas 24 horas, olhe para sua vida com olhos de cirurgião. Identifique três dores suas. Aquela tarefa chata, aquele processo que todos reclamam, a confusão no grupo da família. Perguntem-se por que isso ainda dói. Geralmente é porque achavam que precisava de um programador caro. Agora você tem a IA. Tragam essa dor para a próxima aula. Vamos deixar de ser observadores e virar construtores. O futuro não pertence a quem apenas usa IA. Pertence a quem conduz a IA para resolver problemas reais. Você é o arquiteto. Eu sou Ray Jane. Bem-vindos a Doze Brain.",
  created_at: now, updated_at: now
});

const v3 = db.videos.insertOne({
  title: "Aula 2: Psicologia Real da Dor",
  youtube_id: "kDSsKjM-kps",
  lesson_order: NumberInt(3),
  module_id: mod1Id,
  is_configured: true,
  is_released: true,
  description: "Aula 2 — Frequência, custo e urgência emocional. Produto bom vende alívio.",
  video_type: "youtube",
  teaching_moments: [],
  transcript: "A psicologia real da dor. Antes de falarmos de tecnologia, eu quero falar de algo que todo ser humano conhece. Feche os olhos por um segundo. Pense na última vez que algo pequeno te incomodou tanto que você não conseguiu ignorar. Não era uma tragédia, não era um desastre, era algo simples, mas que ficava ali martelando um e-mail que você não queria responder, uma conta que você não queria abrir, uma conversa que você estava adiando. Isso é dor. Não a dor física, a dor psicológica. A tensão que se acumula quando algo está fora do lugar e você sabe disso. E é dessa dor que todos os produtos que realmente mudam o mundo são feitos. Não de tecnologia, não de inovação, mas de alívio. Dor não é reclamação. Dor não é feedback. Dor é tensão não resolvida. É aquilo que continua existindo mesmo quando você tenta ignorar. Toda dor real tem três características. A primeira é frequência. Ela não acontece uma vez. Ela volta todo dia, toda semana, em toda situação parecida. A segunda é custo. Ela rouba algo de você. Tempo, energia, dinheiro ou paz mental. A terceira é urgência emocional. Ela incomoda mesmo quando você finge que está tudo bem. Ela fica ali pressionando por atenção. Se uma suposta dor essas três coisas: frequência, custo e urgência emocional, ela não sustenta um produto. E aqui está um erro clássico de quem começa a criar soluções. Confundir o que o usuário diz com o que o usuário faz. Usuários mentem, não por maldade, mas porque não entendem a própria mente. Eles dizem que querem uma coisa, mas continuam fazendo outra. E em produto, o que importa não é opinião, é comportamento observável. Um agente no Code de verdade não constrói sistemas baseados em entrevistas bonitas, ele constrói sistemas baseados em ações repetidas. Se alguém diz que odeia planilhas, mas abre aquela planilha todos os dias, isso é uma dor. Se alguém reclama de um processo, mas continua passando por ele toda semana, isso é uma dor. Agora vamos dar um passo mais profundo. As pessoas não querem executar tarefas. Elas querem eliminar estados psicológicos desconfortáveis. Ninguém quer organizar tarefas. As pessoas querem parar de se sentir atrasadas. Ninguém quer controlar finanças. Elas querem parar de sentir ansiedade quando olham para o banco. Ninguém quer gerenciar projetos. Elas querem parar de se sentir perdidas. Produto bom não vem tarefa. Produto bom vem alívio. Como agente de IA, você precisa enxergar dois mapas ao mesmo tempo. O mapa da tarefa visível e o mapa da dor invisível. Quem enxerga só a tarefa constrói ferramentas. Quem enxerga a dor constrói produtos. Agora vamos falar de hábito. Hábito não é vício. Hábito é economia cognitiva. O cérebro humano odeia gastar energia. Ele quer repetir o que já funcionou antes. É por isso que quando você sente o mesmo tipo de desconforto, você abre o mesmo aplicativo. Bons produtos se encaixam em rotinas que já existem. Produtos ruins tentam criar rotinas novas. E é aqui que a inteligência artificial muda tudo. A Iá moderna não serve apenas para responder, ela serve para interpretar contexto. Contexto é a soma de o que você fez antes, onde você está agora, o que você provavelmente quer e o quão difícil é agir. Quando você entende contexto, você não empurra funcionalidades, você entrega o próximo passo óbvio. E quando um sistema sempre entrega o próximo passo óbvio, ele deixa de ser uma ferramenta. Ele se torna inevitável.",
  created_at: now, updated_at: now
});

const v4 = db.videos.insertOne({
  title: "Aula 3: Quebrando Paradigmas",
  youtube_id: "i1KkgV3eSdI",
  lesson_order: NumberInt(4),
  module_id: mod1Id,
  is_configured: true,
  is_released: true,
  description: "Aula 3 — Era da intenção, Vibe Coding, geração de bilhões solo.",
  video_type: "youtube",
  teaching_moments: [],
  transcript: "começarmos, eu preciso quebrar um mito que te segurou a vida toda. O mito de que para criar tecnologia você precisa ser um gênio da matemática, decorar manuais técnicos e passar noites em claro olhando para uma tela preta com letras verdes. Durante 40 anos existiu o que chamamos de taxa de sintaxe. Se você tivesse uma ideia brilhante para um negócio, mas não soubesse onde colocar uma chave ou um ponto e vírgula no código, sua ideia morria. Ou você pagava uma fortuna para um desenvolvedor, ou você desistia. O programador era o tradutor necessário entre o seu cérebro humano e o cérebro da máquina. Eu estou aqui para dar a notícia oficial. O tradutor foi demitido, o muro caiu. Nós não estamos mais na era da sintaxe, nós entramos na era da intenção. Hoje a máquina entende português, inglês, espanhol e até gírias. Você faz parte de uma nova categoria econômica que está assustando o mercado tradicional. Bem-vindos à geração Vibe Code. Mas Ray Jane, isso é papo futurista ou tem gente ganhando dinheiro com isso hoje? Vamos aos fatos. O termo vibe coding explodiu no vale do silício porque pessoas comuns começaram a construir império sozinhas. Olhem para Peter Levels. Ele é um empreendedor nômade que construiu o fotoaii.net. Ele não tem uma equipe de 50 engenheiros. Ele usa IA para escrever 90% do código que ele não quer escrever. O resultado? Uma empresa que fatura milhões de dólares por ano, operada de um laptop, muitas vezes enquanto ele está num café. Querem um exemplo ainda mais impressionante? Ravi Lopez. Ele era um artista digital, não um programador senior. Ele teve a ideia do Magnific AI, uma ferramenta para melhorar a resolução de imagens. Ele usou o GPT4 para escrever as partes complexas de React e Python que ele não dominava. Ele dizia para Ia: Não, não está bom. Quero que a imagem carregue mais rápido. Quero que o botão seja mais chamativo. Ele codificou pela vibe, pela estética, pela insistência. Resultado, em poucos meses, a ferramenta virou febre global e foi adquirida por uma fortuna. Então, como isso funciona? Na prática? Você vai sentar na frente do computador e a mágica acontece? Não, vibe coding não é mágica, é iteração. Antigamente, se você errasse uma linha de código, o programa quebrava e você levava horas caçando o erro. Hoje o processo é uma conversa. Você usa ferramentas como cursor, Riplet ou Vzer e diz: Cria um site para minha pizzaria. Aí a cria, talvez fique feio. Aí entra o vibe coder. Você diz: Está muito formal. Deixa mais divertido. Coloca um botão de WhatsApp piscando aqui e muda esse fundo para preto. Aí a reescreve o código em segundos. Você não está digitando código. Você está moldando o software como se fosse argila. O seu trabalho é ter o bom gosto e a persistência de pedir até ficar perfeito. A Ia é incansável. Ela não pede férias. Ela não reclama de refazer. Sam Altman, o criador do chat GPT, fez uma previsão que está tirando o sono de muita gente grande. Em breve veremos a primeira empresa de bilhão de dólares gerida por uma única pessoa. Pensem nisso. 1 bilhão de dólares sem departamento de RH, sem gerente de projetos. Quem será essa pessoa? Não será o programador tradicional que perde tempo discutindo qual linguagem é tecnicamente superior. Será um vibe coder. Será alguém como você, alguém que entende do negócio, entende pessoas e usa a IA para construir a frota. Isso cria a maior oportunidade da sua carreira. Quem tem mais poder agora? É o advogado que sabe onde o processo trava. É o contador que sabe qual planilha é um inferno. É o pastor que sabe como é difícil organizar os voluntários. A sua experiência de vida é o mapa. A IA é o veículo. Esqueça a síndrome do impostor. Se você sabe falar português, sabe o que quer e tem a coragem de pedir, você é técnico o suficiente para 2025. Você não está aqui para ser um usuário. Você está aqui para ser um diretor de inteligência. Ajuste a sua frequência, aumente a sua ambição. Eu sou Ray Jane. Vamos codar na vibe.",
  created_at: now, updated_at: now
});

const v5 = db.videos.insertOne({
  title: "Aula 4: O Ciclo do Hábito",
  youtube_id: "UbJpxSTORwA",
  lesson_order: NumberInt(5),
  module_id: mod1Id,
  is_configured: true,
  is_released: true,
  description: "Aula 4 — Hook Model, dopamina, gatilhos internos e antecipação de valor.",
  video_type: "youtube",
  teaching_moments: [],
  transcript: "O ciclo do hábito e a dopamina. Vamos começar com algo simples, mas profundo. Você não abre um aplicativo porque ele é bom. Você abre um aplicativo porque algo dentro de você pediu por ele. Às vezes é tédio, às vezes é ansiedade, às vezes é solidão, às vezes é só aquele vazio entre uma tarefa e outra. Esse pequeno desconforto interno é o que chamamos de gatilho. Near Alel organizou isso em um modelo chamado Hook Model. gatilho, ação, recompensa, investimento, mas quero que você esqueça os nomes técnicos por um momento e pense como um ser humano. Quando você pega o celular sem perceber, você não pensa: Vou abrir o Instagram. Seu cérebro pensa: Eu quero parar de me sentir assim. Isso é o gatilho real. Agora vem a ação. E existe uma regra dura sobre comportamento humano. Se for difícil, não acontece. O cérebro odeia fricção. Ele sempre escolhe o caminho mais curto entre dor e alívio. É por isso que um botão a mais já derruba conversão. É por isso que formulários longos matam produtos. E é por isso que a Ia mudou o jogo. Antes você precisava aprender a usar um sistema. Hoje o sistema aprende a usar você. Você não navega por menus, você fala, me ajuda, me explica, resolve isso. A ação virou linguagem natural. E quando a ação fica simples, o hábito nasce, depois vem a recompensa e aqui está algo que muda tudo. O seu cérebro não fica viciado na recompensa, ele fica viciado na expectativa da recompensa. Quando você puxa o feed para atualizar, você não sabe o que vai aparecer. Pode ser algo incrível, pode ser algo inútil. Essa incerteza libera dopamina. É por isso que você continua puxando. A inteligência artificial potencializa isso. Cada resposta que ela gera é única. Cada imagem é nova. Cada texto é uma pequena surpresa. Você não recebe um resultado, você recebe uma revelação e isso mantém você voltando. Agora vem o último passo, o investimento. Toda vez que você usa um sistema, você coloca algo de você ali. Tempo, dados, preferências, história. O sistema começa a te conhecer. E quando um produto te conhece, sair dele dói. Você não troca de Spotify porque suas playlists moram lá. Você não troca de ferramentas porque sua identidade digital mora lá. Agora veja o que muda com a IA. Antes o gatilho vinha só de você. Você sentia algo e agia. Agora o sistema observa padrões. Ele sabe quando você costuma ficar cansado, quando você costuma ficar inseguro, quando você costuma pedir ajuda e ele age antes de você. Isso não é invasão, isso é antecipação de valor. É como um bom amigo que traz café antes de você pedir, porque sabe que você sempre quer café naquele horário. Os produtos mais poderosos de hoje não esperam. Eles sentem, eles leem intenção, eles respondem emoção. E quando isso acontece, o produto deixa de ser uma ferramenta. Ele vira um hábito. É isso que vocês estão aprendendo a construir aqui.",
  created_at: now, updated_at: now
});

// --- VIDEOS: Module 2 (Seu Ambiente Google) — placeholder ---
print("Seeding: videos (Module 2-4 — placeholders)");
const mod2Id = modIds[1];
const mod3Id = modIds[2];
const mod4Id = modIds[3];

db.videos.insertMany([
  { title: "Configurando o AI Studio", lesson_order: NumberInt(1), module_id: mod2Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "Firebase Studio na Prática", lesson_order: NumberInt(2), module_id: mod2Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "Dominando o Gemini", lesson_order: NumberInt(3), module_id: mod2Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
]);

db.videos.insertMany([
  { title: "Flutter para Vibe Coders", lesson_order: NumberInt(1), module_id: mod3Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "Autenticação e Firestore", lesson_order: NumberInt(2), module_id: mod3Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "Integrações e APIs", lesson_order: NumberInt(3), module_id: mod3Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
]);

db.videos.insertMany([
  { title: "Deploy com Firebase Hosting", lesson_order: NumberInt(1), module_id: mod4Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "Vertex AI em Produção", lesson_order: NumberInt(2), module_id: mod4Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "Projeto Final", lesson_order: NumberInt(3), module_id: mod4Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
]);

// --- VIDEOS: Modules 5-10 (expanded curriculum) ---
print("Seeding: videos (Modules 5-10 — expanded curriculum)");
const mod5Id = modIds[4], mod6Id = modIds[5], mod7Id = modIds[6], mod8Id = modIds[7], mod9Id = modIds[8], mod10Id = modIds[9];

// Module 5: Fundamentos de Modelos de IA
db.videos.insertMany([
  { title: "1.1 Panorama do Ecossistema de IA", lesson_order: NumberInt(1), module_id: mod5Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "1.2 Fine-Tuning e Adaptação de Modelos", lesson_order: NumberInt(2), module_id: mod5Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "1.3 Embeddings e Representação Vetorial", lesson_order: NumberInt(3), module_id: mod5Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "1.4 Tokenização e Processamento de Texto", lesson_order: NumberInt(4), module_id: mod5Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "1.5 Arquitetura Transformer Deep Dive", lesson_order: NumberInt(5), module_id: mod5Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
]);

// Module 6: RAG
db.videos.insertMany([
  { title: "2.1 Fundamentos de RAG", lesson_order: NumberInt(1), module_id: mod6Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "2.2 Estratégias de Chunking (Deep Dive)", lesson_order: NumberInt(2), module_id: mod6Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "2.3 Agentic RAG com Fallback", lesson_order: NumberInt(3), module_id: mod6Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "2.4 RAG sobre Documentos Complexos", lesson_order: NumberInt(4), module_id: mod6Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "2.5 RAG sobre Vídeo e Áudio", lesson_order: NumberInt(5), module_id: mod6Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
]);

// Module 7: MCP
db.videos.insertMany([
  { title: "3.1 Arquitetura MCP e Primeiro Server", lesson_order: NumberInt(1), module_id: mod7Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "3.2 Agentic RAG via MCP", lesson_order: NumberInt(2), module_id: mod7Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "3.3 Multi-Agent Financial Analyst", lesson_order: NumberInt(3), module_id: mod7Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "3.4 Unified MCP Server (200+ Data Sources)", lesson_order: NumberInt(4), module_id: mod7Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "3.5 Shared Memory entre Ferramentas", lesson_order: NumberInt(5), module_id: mod7Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
]);

// Module 8: Agentes Autônomos
db.videos.insertMany([
  { title: "4.1 Fundamentos de Agentes", lesson_order: NumberInt(1), module_id: mod8Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "4.2 LangGraph: Grafos de Agentes", lesson_order: NumberInt(2), module_id: mod8Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "4.3 CrewAI: Multi-Agent Orchestration", lesson_order: NumberInt(3), module_id: mod8Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "4.4 Governança e Safety", lesson_order: NumberInt(4), module_id: mod8Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "4.5 Projeto: Agente Autônomo Completo", lesson_order: NumberInt(5), module_id: mod8Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
]);

// Module 9: Deploy e Infraestrutura
db.videos.insertMany([
  { title: "5.1 VPS Setup para IA", lesson_order: NumberInt(1), module_id: mod9Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "5.2 Docker e Containerização", lesson_order: NumberInt(2), module_id: mod9Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "5.3 CI/CD com GitHub Actions", lesson_order: NumberInt(3), module_id: mod9Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "5.4 Monitoramento e Observabilidade", lesson_order: NumberInt(4), module_id: mod9Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "5.5 Projeto: Deploy Completo", lesson_order: NumberInt(5), module_id: mod9Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
]);

// Module 10: Produto e Monetização
db.videos.insertMany([
  { title: "6.1 Modelos de Negócio para IA", lesson_order: NumberInt(1), module_id: mod10Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "6.2 Integração de Pagamentos", lesson_order: NumberInt(2), module_id: mod10Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "6.3 Growth e Viral Loops", lesson_order: NumberInt(3), module_id: mod10Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "6.4 Onboarding e Retenção", lesson_order: NumberInt(4), module_id: mod10Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
  { title: "6.5 Projeto: MVP Completo", lesson_order: NumberInt(5), module_id: mod10Id, is_configured: false, is_released: false, video_type: "youtube", teaching_moments: [], created_at: now, updated_at: now },
]);

// --- QUIZZES (linked to real videos) ---
print("Seeding: video_quizzes (2)");
db.video_quizzes.insertMany([
  {
    video_id: v2.insertedId,
    question: "Qual é o principal sinal de alerta do corpo?",
    options: ["Fome", "Dor", "Sono", "Sede"],
    correct_option_index: NumberInt(1),
    explanation: "A dor é um mecanismo de proteção do corpo que nos alerta sobre possíveis problemas.",
    question_order: NumberInt(1),
    timestamp_seconds: NumberInt(60),
    difficulty: "medium",
    question_type: "multiple_choice",
    created_at: now, updated_at: now
  },
  {
    video_id: v2.insertedId,
    question: "O que mais afeta a postura no trabalho?",
    options: ["Luz do ambiente", "Ergonomia da cadeira", "Temperatura", "Ruído"],
    correct_option_index: NumberInt(1),
    explanation: "A ergonomia adequada da cadeira e mesa é fundamental para uma boa postura.",
    question_order: NumberInt(2),
    timestamp_seconds: NumberInt(120),
    difficulty: "medium",
    question_type: "multiple_choice",
    created_at: now, updated_at: now
  }
]);

// --- MISSION ---
print("Seeding: missions (1)");
db.missions.insertOne({
  title: "Reflexão sobre a Introdução",
  description: "Após assistir à aula introdutória, reflita sobre os principais conceitos apresentados e como eles se aplicam ao seu contexto.",
  instructions: "Escreva um texto de 3-5 parágrafos explicando:\n1. Os principais conceitos que você aprendeu\n2. Como esses conceitos se relacionam com algo do seu dia-a-dia\n3. Uma dúvida ou ponto que gostaria de explorar mais",
  video_id: v1.insertedId,
  evidence_type: "text",
  difficulty_level: "básico",
  points_reward: NumberInt(15),
  evaluation_criteria: [
    "Demonstra compreensão dos conceitos principais da aula",
    "Apresenta reflexão crítica e pessoal",
    "Conecta o conteúdo com exemplos práticos",
    "Texto bem estruturado e coerente"
  ],
  is_active: true,
  mission_order: NumberInt(1),
  created_at: now, updated_at: now
});

// ============================================================
// FINAL VERIFICATION
// ============================================================
print("\n=== VERIFICATION ===\n");
const collections = db.getCollectionNames().sort();
print("Collections created: " + collections.length);
collections.forEach(c => {
  const count = db.getCollection(c).countDocuments();
  const indexes = db.getCollection(c).getIndexes().length;
  print("  " + c.padEnd(30) + count + " docs, " + indexes + " indexes");
});

print("\n=== REBUILD COMPLETE ===");
