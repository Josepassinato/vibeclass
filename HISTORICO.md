# HISTORICO — vid-teach-guide (Vibe Class)

## 2026-03-31 — Sistema de Memoria Longa e Aprendizado Continuo do Tutor

### O que foi feito

Implementação completa de memória de longo prazo e aprendizado contínuo personalizado para o tutor IA de voz.

#### Fase 1: Persistir e Injetar Memória

1. **Migration SQL** (`20260331100000_tutor_memory_system.sql`)
   - Tabela `tutor_conversations`: histórico persistente de conversas (student_id, session_id, role, content, video_context)
   - Tabela `learning_insights`: insights de aprendizagem gerados por IA (strengths, weaknesses, patterns, recommendations, risks)
   - Tabela `concept_mastery`: grafo de conhecimento simplificado (conceito, mastery_level 0-1, tentativas)
   - Função SQL `get_student_memory_context()`: consolida perfil + conversations + insights + mastery + quiz stats + observations
   - Função SQL `upsert_concept_mastery()`: atualiza domínio de conceito com cada tentativa
   - Índices e RLS configurados

2. **Edge function `tutor-memory`** — 4 ações:
   - `get_context`: consolida toda memória do aluno em texto compacto para system instruction
   - `save_message`: persiste mensagem individual
   - `save_messages_batch`: persiste múltiplas mensagens de uma vez
   - `end_session`: dispara análise de padrões ao fim da sessão

3. **Hook `useTutorMemory.ts`** — gerencia memória no frontend:
   - Busca contexto consolidado do edge function ao conectar
   - Bufferiza conversas e faz flush ao DB a cada 30s ou 10 mensagens
   - Refresh automático do contexto a cada 5 minutos (mid-session update)
   - `endSession()` faz flush final + dispara análise

4. **VoiceChat.tsx integrado** — system instruction agora recebe contexto dinâmico:
   - Memória do aluno injetada no prompt (perfil, insights, conceitos fracos, conversas recentes)
   - Conversas persistidas automaticamente via `addTutorMessage()`
   - Disconnect chama `endTutorSession()` para trigger de análise

#### Fase 2: Aprendizado Contínuo

5. **Edge function `analyze-learning-patterns`** — roda ao fim de cada sessão:
   - Coleta: profile + quiz_results + observations + conversations + insights existentes
   - Grok analisa e gera: novos insights, concept mastery estimates, profile updates
   - Invalida insights desatualizados
   - Atualiza perfil do aluno automaticamente (learning_style, strengths, areas_to_improve)

6. **Quiz Generator adaptativo** — `quiz-generator` modificado:
   - Aceita `weak_concepts` e `avg_quiz_score` opcionais
   - Ajusta distribuição de dificuldade: aluno fraco → mais básicas; aluno forte → mais avançadas
   - Prioriza perguntas sobre conceitos com baixo mastery

#### Fase 3: Personalização Ativa

7. **RAG Personalizado** — `search-transcript` modificado:
   - Aceita `student_id` opcional
   - Busca conceitos fracos do aluno na tabela `concept_mastery`
   - Enriquece query com conceitos fracos para melhor relevância
   - Re-rank: boost em chunks que mencionam conceitos que o aluno tem dificuldade

8. **Dashboard de Recomendações** — `PersonalizedRecommendations.tsx`:
   - Mapa de Domínio: barra de progresso por conceito com mastery_level
   - Insights de Aprendizagem: cards coloridos por tipo (strength, weakness, recommendation, risk)
   - Recomendações de Estudo: lista conceitos que precisam reforço
   - Integrado no StudentDashboard antes do AI Analytics

### Arquivos Novos
- `supabase/migrations/20260331100000_tutor_memory_system.sql`
- `supabase/functions/tutor-memory/index.ts`
- `supabase/functions/analyze-learning-patterns/index.ts`
- `src/hooks/useTutorMemory.ts`
- `src/components/PersonalizedRecommendations.tsx`

### Arquivos Modificados
- `src/components/VoiceChat.tsx` — integra useTutorMemory, injeta memória no system instruction
- `src/pages/StudentDashboard.tsx` — adiciona PersonalizedRecommendations
- `supabase/functions/quiz-generator/index.ts` — dificuldade adaptativa
- `supabase/functions/search-transcript/index.ts` — RAG personalizado

### Deploy
- Frontend: rsync → /var/www/escola-12brain/ → escola.12brain.org HTTP 200
- Migration SQL: aplicada via API (3 tabelas + 2 funções + índices + RLS)
- Edge functions: 4 deployadas (2 novas + 2 atualizadas)
- Build: 0 erros TypeScript, 21s, PWA 63 entries

### Smoke Tests
- escola.12brain.org → HTTP 200
- tutor-memory (get_context) → HTTP 200
- tutor-memory (save_message) → HTTP 200
- analyze-learning-patterns → HTTP 200
- 3 tabelas verificadas: tutor_conversations, learning_insights, concept_mastery
- 2 funções SQL verificadas: get_student_memory_context, upsert_concept_mastery

### Sandbox
- /root/sandbox/vid-teach-guide_2026-03-31_tutor-memory/

### Integracoes ativas
- Supabase: emeeklwuvemhqiglsect (secrets: XAI_API_KEY, OPENAI_API_KEY)
- Cloudflare Stream: videos hospedados
- Grok xAI: tutor de voz + quiz + feedback + content manager + analyze-learning-patterns
- OpenAI: embeddings (text-embedding-3-small) + whisper
- HeyGen: avatar streaming
- Twilio WhatsApp: +18565531520 → whatsapp-study-bot
- DNS: escola.12brain.org (Hostinger)
- HTTPS: Let's Encrypt (auto-renew)

---

## 2026-03-31 — Resolucao de pendencias e deploy completo

### O que foi feito

#### 1. VITE_HEYGEN_API_KEY configurada
- Adicionada `VITE_HEYGEN_API_KEY` no `.env` (a key existia sem prefixo VITE_)
- Avatar HeyGen agora funcional no frontend

#### 2. Rota /verificar/:code criada
- **Arquivo**: `src/pages/VerifyCertificate.tsx`
- Pagina publica que valida certificados via QR code
- Consulta tabela `certificates` no Supabase por `certificate_code`
- Design dark gradient com icones de status (valido/invalido)
- Exibe: nome do aluno, modulo, data de emissao, codigo
- Rota adicionada ao `src/App.tsx` (lazy loaded)

#### 3. OPENAI_API_KEY verificada
- Ja configurada nos dois projetos Supabase (emeeklwuvemhqiglsect e armabaquiyqmdgwflslq)
- Embeddings e fallback de voz funcionais

#### 4. Embeddings dos transcripts gerados (RAG)
- 5 videos embedados via edge function `embed-transcript`
- Total: 10 chunks (Introducao=1, Aula1=3, Aula2=2, Aula3=2, Aula4=2)
- RAG search agora funcional para Chat com as Aulas

#### 5. Webhook Twilio/WhatsApp configurado
- Messaging Service criado: `Vibe Class WhatsApp Bot` (MG946bdb3a42ac2bf7c634a72d911892f2)
- Numero: +18565531520 atribuido ao servico
- Webhook: `https://emeeklwuvemhqiglsect.supabase.co/functions/v1/whatsapp-study-bot`
- Testado: retorna TwiML corretamente

#### 6. Build + Deploy producao
- Build: 27s, 0 erros TypeScript, PWA 63 entries
- Deploy: rsync para /var/www/escola-12brain/
- Testado: escola.12brain.org → HTTP 200 (home, login, verificar)

### Sandbox
- /root/sandbox/vid-teach-guide_2026-03-31_pendencias/

### Pendente
- [ ] Configurar VITE_SENTRY_DSN (criar projeto no sentry.io)
- [ ] Configurar Google OAuth no Supabase Dashboard
- [ ] Substituir PWA icons placeholder por icones reais do Vibe Class
- [ ] Para WhatsApp bot funcionar end-to-end: alunos precisam ter campo `phone` no perfil

### Integracoes ativas
- Supabase: emeeklwuvemhqiglsect (secrets: XAI_API_KEY, OPENAI_API_KEY)
- Cloudflare Stream: videos hospedados
- Grok xAI: tutor de voz + quiz + feedback + content manager
- OpenAI: embeddings (text-embedding-3-small) + whisper
- HeyGen: avatar streaming (VITE_HEYGEN_API_KEY configurada)
- Twilio WhatsApp: +18565531520 → whatsapp-study-bot edge function
- DNS: escola.12brain.org (Hostinger)
- HTTPS: Let's Encrypt (auto-renew)

---

## 2026-03-31 — Implementacao de 10 features disruptivas

### Resumo
10 novas features implementadas para tornar a escola extremamente tecnológica. Todas usando Grok (xAI) como motor de IA conversacional. Build de producao OK (0 erros TypeScript, 31s build).

### Features Implementadas

#### 1. Chat com as Aulas (RAG Conversacional)
- **Arquivo**: `src/components/TranscriptChat.tsx`
- Busca semântica nos transcripts via pgvector (search-transcript)
- Grok gera respostas conversacionais baseadas nos trechos encontrados
- Botão "Ir para o momento" navega ao vídeo/timestamp correto
- Integrado na nav mobile (tab "Chat IA") e desktop (botão na action bar)

#### 2. Tutor Proativo nos Teaching Moments
- **Arquivo**: `src/hooks/useProactiveTutor.ts`
- Monitora tempo do vídeo vs teaching moments (tolerância 3s)
- Pausa automaticamente e gera pergunta socrática baseada no key_insight
- Detecta confusão: 3+ pausas/rewinds em 30s → oferece ajuda contextual
- Rastreia momentos já ativados para não repetir

#### 3. Quiz Dinâmico Gerado por IA
- **Arquivo**: `src/components/DynamicQuiz.tsx`
- Botão "Gerar Quiz com IA" chama quiz-generator (Grok)
- Perguntas exibidas uma por vez com animações framer-motion
- Feedback imediato com explicação, badge de dificuldade colorido
- Integra com gamificação: +20 XP por acerto
- Integrado na nav mobile (tab "Quiz IA")

#### 4. Hub de Gamificação Completo
- **Arquivo**: `src/components/GamificationHub.tsx`
- SVG circular progress ring de XP com animação
- Streak com ícone de fogo + recorde
- Grid 3x3 de badges (9 conquistas, earned=colorido, unearned=grayscale)
- Leaderboard top 5 com ícones de rank
- Integrado na nav mobile (tab "XP") e no dashboard

#### 5. Avatar HeyGen para Feedback
- **Arquivo**: `src/components/AvatarFeedback.tsx`
- Integração com HeyGen Streaming API (WebSocket)
- 3 modos: feedback, intro, encouragement (cores distintas)
- Fallback elegante: typewriter animation quando API não disponível
- Controles play/pause/mute

#### 6. Dashboard IA com Analytics
- **Arquivo**: `src/components/AIAnalyticsDashboard.tsx`
- 4 KPI cards: tempo de estudo, quiz avg, streak, aulas completadas
- Relatório semanal gerado por Grok (pontos fortes, melhorias, próxima aula)
- Heatmap de atenção por aula (cores por score)
- Gráfico de performance (recharts AreaChart)
- Padrão de estudo semanal (grid estilo GitHub)
- Indicador de risco de dropout (semáforo)
- Integrado no StudentDashboard

#### 7. Legendas Traduzidas com Destaque
- **Arquivo**: `src/components/EnhancedCaptions.tsx`
- Segmentação automática do transcript por tempo
- Destaque do segmento atual + auto-scroll
- Keywords dos teaching moments em amber/gold
- Toggle de idioma PT-BR/EN/ES (tradução via Grok)
- Controle de tamanho de fonte

#### 8. PWA Offline Manager
- **Arquivo**: `src/components/OfflineManager.tsx`
- Download de aulas para IndexedDB (transcript + quiz + metadata)
- Barra de storage (usado/50MB)
- Status online/offline em tempo real
- Auto-sync de respostas pendentes ao reconectar
- Lista de conteúdo cacheado com opção de deletar

#### 9. WhatsApp Study Bot
- **Arquivo**: `supabase/functions/whatsapp-study-bot/index.ts`
- Edge function para webhook Twilio/WhatsApp
- 5 comandos: resumo, quiz, streak, próxima, ajuda
- Respostas geradas por Grok (grok-3-mini-fast)
- Lookup de aluno por telefone
- Resposta em formato TwiML

#### 10. Certificado Verificável com QR
- **Arquivo**: `src/components/VerifiableCertificate.tsx`
- Design dark gradient com bordas douradas
- QR code via api.qrserver.com → escola.12brain.org/verificar/{code}
- 3 ações: Baixar PDF, Compartilhar LinkedIn, Copiar Link
- Stats opcionais: quiz avg, aulas, XP

### Arquivos Modificados (integração)
- `src/pages/Student.tsx` — imports + 3 novas seções (Chat/Quiz IA/XP) + botões desktop
- `src/pages/StudentDashboard.tsx` — imports + AIAnalyticsDashboard + GamificationHub
- `src/components/student/MobileNavigation.tsx` — 3 novas tabs (Chat IA, Quiz IA, XP)
- `supabase/functions/content-manager/index.ts` — 2 novas ações: rag_answer + translate (Grok)

### Arquitetura de IA
Toda IA conversacional usa Grok (xAI) via edge functions:
- RAG chat → content-manager (action: rag_answer)
- Tradução → content-manager (action: translate)
- Quiz geração → quiz-generator
- Feedback missões → agent-evaluator + agent-feedback
- WhatsApp bot → whatsapp-study-bot
- Avatar → HeyGen API (com fallback local)

### Build
- TypeScript: 0 erros
- Vite build: 31s, PWA com 62 entries precache
- Sandbox: /root/sandbox/vid-teach-guide_2026-03-31_mongo/

### Pendente
- [ ] Deploy para produção (aguardando aprovação)
- [ ] Configurar VITE_HEYGEN_API_KEY para avatar funcionar
- [ ] Configurar webhook Twilio para WhatsApp bot
- [ ] Gerar embeddings dos transcripts para RAG funcionar (chamar embed-transcript)
- [ ] Criar rota /verificar/:code para validação de certificados

---

## 2026-03-31 — Reconstrucao completa do banco MongoDB

### O que foi feito
- Banco `vibe_class` no MongoDB (container agent-mongodb, porta 27017) reconstruido do zero
- 21 collections criadas com JSON Schema validation (enums, required fields, tipos)
- 51 indexes configurados (unique constraints, compound indexes, sparse)
- Script re-executavel: `/root/sandbox/vid-teach-guide_2026-03-31_mongo/scripts/rebuild-mongodb.js`

### Corrigido vs banco anterior
- Todos os 44 videos agora vinculados ao modulo correto (antes 3 com module_id null)
- YouTube IDs alinhados com Supabase (antes divergiam: Iu5kTUHDCV4 vs Pp-7DJZMSBA etc)
- Schema validation impede dados invalidos (testado: required fields, enums, unique constraints)

### Estado atual do banco MongoDB
| Collection | Docs | Indexes | Status |
|---|---|---|---|
| modules | 10 | 2 | 4 originais + 6 expandidos |
| videos | 44 | 4 | 5 com transcript/youtube, todos com module_id |
| video_quizzes | 2 | 2 | vinculados a Aula 1 |
| missions | 1 | 3 | vinculada a Introducao |
| student_profiles | 0 | 3 | pronta |
| student_observations | 0 | 3 | pronta |
| student_lesson_progress | 0 | 2 | pronta (unique student+video) |
| student_quiz_attempts | 0 | 2 | pronta |
| student_quiz_results | 0 | 2 | pronta (unique student+video) |
| student_open_answers | 0 | 2 | pronta |
| student_mission_submissions | 0 | 4 | pronta |
| student_achievements | 0 | 2 | pronta (unique student) |
| student_xp | 0 | 3 | pronta (leaderboard index) |
| squads | 0 | 1 | pronta |
| squad_members | 0 | 3 | pronta (unique user) |
| squad_mission_submissions | 0 | 2 | pronta |
| certificates | 0 | 3 | pronta (unique code) |
| transcript_embeddings | 0 | 2 | pronta para RAG |
| profiles | 0 | 2 | pronta (unique user) |
| user_roles | 0 | 2 | pronta (unique user+role) |
| users | 0 | 2 | pronta (unique email) |

### Sandbox
- /root/sandbox/vid-teach-guide_2026-03-31_mongo/

### Pendente
- [ ] Criar camada de acesso a dados (data access layer) para app usar MongoDB
- [ ] Configurar MONGODB_URI no .env da aplicacao
- [ ] Migrar queries Supabase SDK para MongoDB driver no frontend/edge functions

---

## 2026-03-31 — Verificacao e conclusao da reconstrucao do banco (Supabase)

### Diagnostico
- 20 tabelas verificadas no Supabase (emeeklwuvemhqiglsect)
- Dados de conteudo OK: 4 modules, 5 videos (com transcripts timestampados + teaching_moments), 2 quizzes, 1 mission
- 4 migrations extras ja aplicadas: quiz_difficulty, pgvector_embeddings, gamification, open_questions
- Tabelas de runtime (student_*, squads, certificates) existem e vazias (correto — sem alunos ainda)

### Corrigido
- RLS policies recursivas em squads/squad_members/squad_mission_submissions (erro 42P17 infinite recursion)
  - Criada funcao SECURITY DEFINER `user_squad_ids()` para quebrar recursao
  - Migration: 20260331000001_fix_squad_rls_recursion.sql
- Videos vinculados ao Modulo 1 "Fundamentos do Empreendedor Vibe" (estavam com module_id NULL)

### Estado atual do banco
| Tabela | Rows | Status |
|--------|------|--------|
| modules | 4 | OK |
| videos | 5 | OK (transcripts + teaching_moments + module_id) |
| video_quizzes | 2 | OK (com difficulty + question_type) |
| missions | 1 | OK |
| student_xp | 0 | OK (gamification pronta) |
| transcript_embeddings | 0 | OK (pgvector pronta) |
| student_open_answers | 0 | OK |
| squads + squad_members | 0 | OK (RLS corrigida) |
| Demais 9 tabelas student/cert | 0 | OK |

### Producao
- https://escola.12brain.org → HTTP 200

### Sandbox
- /root/sandbox/vid-teach-guide_2026-03-31/

---

## 2026-03-29 — Video ocupa 85% da tela

### Alterado
- src/components/VoiceChat.tsx: grid de [1fr_360px] para [85fr_15fr], video com h-[calc(85vh-54px)], padding reduzido
- src/components/VideoPlayer.tsx: Card com h-full sempre, video usa h-[calc(100%-56px)] em todos os estados
- src/components/DirectVideoPlayer.tsx: mesma mudanca do VideoPlayer

### Resultado
- Desktop: video ocupa ~85% da tela, chat Tutor IA em coluna estreita (~15%) a direita
- Mobile: video ocupa quase toda a tela, controles visiveis abaixo
- Controles (timeline, pausas, dica de voz) ficam visiveis sem scroll
- Testado em producao: https://escola.12brain.org — HTTP 200, sem erros

### Sandbox
- /root/sandbox/vid-teach-guide_2026-03-29/

---

## 2026-03-17 — Implementacao completa das 4 fases do TAREFAS_CLAUDE_CODE.json

### O que foi feito
- **21 tarefas concluidas** em 4 fases, 56 arquivos, +3471 linhas
- Branch: `claude/review-vid-teach-guide-CR1xp`
- Sandbox: `/root/sandbox/vid-teach-guide_2026-03-17/`

### Fase 1: Fundacao
- F1-T1: Legendas em tempo real (LiveCaptions.tsx)
- F1-T2: Reconexao WebSocket com backoff exponencial (useWebSocketReconnect.ts)
- F1-T3: AudioWorklet off main thread (audio-processor.worklet.js)
- F1-T4: Controle de velocidade 0.75x-2x
- F1-T5: Sentry monitoring (@sentry/react)
- F1-T6: +19 testes unitarios

### Fase 2: Experiencia
- F2-T1: Quiz adaptativo por dificuldade
- F2-T2: Feedback contextual por opcao errada (useContextualFeedback.ts)
- F2-T3: PWA com Service Worker (vite-plugin-pwa)
- F2-T4: Picture-in-Picture
- F2-T5: HLS.js streaming adaptativo
- F2-T6: OAuth Google login

### Fase 3: Inteligencia
- F3-T1: RAG com pgvector (embed-transcript + search-transcript)
- F3-T2: Intervencao contextual do professor (useContextualIntervention.ts)
- F3-T3: Audio pipeline unificado (useAudioPipeline.ts + useAudioPlayback.ts)
- F3-T4: Fallback automatico OpenAI/Gemini (useVoiceProvider.ts)
- F3-T5: Dashboard analytics (/admin/analytics)

### Fase 4: Escala
- F4-T1: i18n com react-intl (pt-BR, en-US, es-ES)
- F4-T2: Gamificacao XP/streaks/leaderboard
- F4-T3: Perguntas abertas avaliadas por IA
- F4-T4: Plano de migracao Next.js (documentado, nao executado)

### Pendencias (resolvidas em 2026-03-28)
- ~~Rodar 4 migrations SQL~~ FEITO
- ~~Deploy edge functions: embed-transcript, search-transcript~~ FEITO
- ~~Aprovar deploy do sandbox para producao~~ FEITO
- Configurar: VITE_SENTRY_DSN, Google OAuth no Supabase Dashboard
- Substituir PWA icons placeholder por icones reais do Vibe Class

### Integracoes ativas
- Supabase: projeto "Escola 12 brain" (armabaquiyqmdgwflslq)
- Cloudflare Stream: videos hospedados
- OpenAI Realtime API: tutor de voz
- Gemini Live: tutor alternativo

---

## 2026-03-28 — Migracao para Grok + Deploy producao

### O que foi feito
- **Limpeza total do Lovable** — removido de 8+ arquivos (index.html, vite.config.ts, package.json, README.md, 4 edge functions)
- **4 migrations SQL aplicadas** no Supabase: quiz_difficulty, pgvector_embeddings, gamification, open_questions
- **Edge functions deployadas** via MCP: embed-transcript, search-transcript, openai-realtime-token
- **Migracao para Grok (xAI)** — 5 edge functions de texto trocadas de OpenAI/Lovable para `api.x.ai` + `grok-3-mini-fast`
- **Tutor de voz migrado** — Grok Voice Agent API como primario (`wss://api.x.ai/v1/realtime`, voz Ara), OpenAI Realtime como fallback automatico
- **Secret XAI_API_KEY** configurado no Supabase
- **Deploy em producao** — https://escola.12brain.org com HTTPS (Let's Encrypt)
- **DNS configurado** — escola.12brain.org -> 76.13.109.151 (A record)
- **Sandbox:** `/root/sandbox/vid-teach-guide_2026-03-27/`

### Arquitetura de IA atual
| Funcao | Provider | Modelo | Fallback |
|--------|----------|--------|----------|
| Tutor de voz (realtime) | Grok xAI | Voice Agent API (Ara) | OpenAI Realtime (echo) |
| Quiz generator | Grok xAI | grok-3-mini-fast | — |
| Agent evaluator | Grok xAI | grok-3-mini-fast | — |
| Agent feedback | Grok xAI | grok-3-mini-fast | — |
| Content manager | Grok xAI | grok-3-mini-fast | — |
| Analyze YouTube | Grok xAI | grok-3-mini-fast | — |
| Embeddings (RAG) | OpenAI | text-embedding-3-small | — |
| Transcricao audio | OpenAI | whisper-1 | — |

### Pendencias restantes
- Configurar OPENAI_API_KEY no Supabase (para fallback voz + embeddings + Whisper)
- Configurar VITE_SENTRY_DSN
- Configurar Google OAuth no Supabase Dashboard
- Substituir PWA icons placeholder por icones reais do Vibe Class

### Integracoes ativas
- Supabase: projeto "Escola 12 brain" (armabaquiyqmdgwflslq)
- Cloudflare Stream: videos hospedados
- Grok Voice Agent API (xAI): tutor de voz primario
- OpenAI Realtime API: tutor de voz fallback
- OpenAI Embeddings + Whisper: RAG e transcricao
- DNS: escola.12brain.org (Hostinger API)
- HTTPS: Let's Encrypt (auto-renew, expira 2026-06-25)
