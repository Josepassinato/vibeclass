# Memoria do Projeto - Vibeclass

Ultima atualizacao: 2026-04-16

## Escopo

Projeto: `Josepassinato/vibeclass`  
Objetivo atual: plataforma escola SaaS com modo white-label, fabrica de cursos (school-factory), automacao de pipeline e deploy continuo.

## Entregas concluidas

- Deploy e estabilizacao dos frontends:
  - `https://whitelabel.12brain.org`
  - `https://vibecode.12brain.org`
- Edge Functions atualizadas em producao:
  - `school-factory`
  - `admin-videos`
- Fundacao SaaS multitenant implementada:
  - organizacoes, memberships, planos, assinaturas, uso mensal e limites
- Painel operacional do school-factory evoluido:
  - handoffs humanos em aberto
  - ultima resposta
  - proxima cobranca
  - painel de custos, SLA, compliance de video, versoes do tutor pack
- Regras criticas aplicadas:
  - bloqueio de conteudo improprio
  - limite de video em 4 minutos
  - gate de qualidade antes de publicar
  - controle de budget com hard stop
- Upload real de PDF com extracao de texto no painel
- Runner automatico via GitHub Actions (cron) ativo
- CI/CD configurado para:
  - quality (tests + integration flow + build)
  - deploy-production (db push + deploy functions)
- Workflow atualizado para sincronizar secrets de video no deploy.

## Integracoes e operacao

- Supabase projeto: `emeeklwuvemhqiglsect`
- Workflows:
  - `.github/workflows/ci-cd.yml`
  - `.github/workflows/school-factory-runner.yml`
- Secrets de CI/Runner configurados no GitHub:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_PROJECT_REF`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SCHOOL_FACTORY_ADMIN_PASSWORD`
  - `DOMAIN_DATA_BACKEND`
  - `XAI_API_KEY`
  - `HEYGEN_API_KEY`
  - `HEYGEN_AVATAR_ID`
  - `HEYGEN_VOICE_ID`
  - `TAVUS_API_KEY`
  - `TAVUS_REPLICA_ID`
  - `TAVUS_BASE_URL`

## Commits importantes (mais recentes)

- `860e65d` feat: finalize school factory saas controls and ops panel
- `9ef3b01` ci: force Node 24 runtime for GitHub actions
- `b6c9208` db: add saas multitenant billing foundation migration
- `9a646d3` ci: sync video provider secrets to Supabase on deploy
- `4fc95c1` Pin Supabase CLI version in CI deploy job

## Estado atual do CI/CD

- Run `24531530658` (CI/CD): **success**
- Run `24531430424` (School Factory Runner manual): **success**
- Run `24531866633` (CI/CD do commit `860e65d`): **failure**
  - Falha no teste `src/integration/schoolFactoryFlow.test.ts`
  - Erro: `createData?.organization?.id` veio `undefined`
  - Linha: `src/integration/schoolFactoryFlow.test.ts:52`
  - Impacto: quality job falha para este commit especifico.

## Pendencia principal para retomada

1. Ajustar o teste de integracao para o payload atual de `create_project` (ou restaurar o campo esperado no retorno da funcao).
2. Reexecutar CI e confirmar verde.
3. Validar novamente fluxo ponta a ponta no painel admin.

## Como retomar rapido depois

1. Abrir este arquivo de memoria primeiro.
2. Verificar status dos workflows no GitHub Actions.
3. Comecar pela pendencia do teste em `src/integration/schoolFactoryFlow.test.ts`.
4. Se necessario, executar smoke test manual:
   - `create_project -> generate_master_plan -> enqueue_pipeline -> run_next_task -> project_status`.

## Observacao de seguranca

Nao armazenar tokens/chaves em codigo ou arquivos versionados.  
Manter secrets apenas em Supabase Secrets e GitHub Actions Secrets.
