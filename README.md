# Vibe Code

Plataforma de ensino por video com tutor IA por voz.

## Produtos

- `Vibe Code` (produto principal, identidade fixa)
- `White Label School` (produto customizável por marca)

## Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth, database, edge functions)
- Cloudflare Stream (videos)
- OpenAI Realtime API (tutor de voz)
- Gemini Live (tutor alternativo)

## Setup local

```sh
git clone <REPO_URL>
cd vid-teach-guide
npm install
npm run dev
```

Para rodar explicitamente cada produto:

```sh
npm run dev:vibe
npm run dev:white-label
```

## Variaveis de ambiente

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SENTRY_DSN=<dsn>
VITE_PRODUCT_MODE=vibe-code # ou white-label
```

### School Factory (modo híbrido Supabase + Mongo)

Para manter Supabase como base e espelhar dados de domínio no Mongo (caminho 2), configure os secrets da Edge Function `school-factory`:

```
ADMIN_PASSWORD=<senha-forte-obrigatoria>
DOMAIN_DATA_BACKEND=hybrid
MONGO_DATA_API_BASE_URL=https://<mongodb-data-api-base-url>
MONGO_DATA_API_KEY=<mongodb-data-api-key>
MONGO_DATA_SOURCE=<atlas-cluster-name>
MONGO_DATA_DATABASE=<database-name>
MONGO_PROJECTS_COLLECTION=school_factory_projects
MONGO_TASKS_COLLECTION=school_factory_tasks
MONGO_MIRROR_TIMEOUT_MS=5000
```

Observações:
- `ADMIN_PASSWORD` não tem mais fallback (`admin123`). Sem esse secret, a função retorna erro `503`.
- Se o Mongo não estiver configurado, o sistema continua funcional em Supabase e sinaliza `mongo_configured: false`.

### SaaS multi-tenant (organizações, plano, uso e billing)

A função `school-factory` agora suporta:

- provisionamento automático de organização (`provision_organization`)
- criação de projeto já vinculada a tenant (`create_project` com `organization_*`)
- memberships com papéis (`upsert_membership`)
- atualização de assinatura/plano (`update_subscription`)
- status completo de tenant/plano/uso (`project_status` e `organization_status`)

Migração nova:

```sh
supabase db push
```

Tabelas criadas:

- `saas_organizations`
- `saas_memberships`
- `saas_plan_limits`
- `saas_subscriptions`
- `saas_usage_monthly`

Limites de plano aplicados automaticamente:

- criação de projetos por mês
- tarefas por mês
- vídeos por mês
- gasto SaaS mensal (USD)

Quando um limite é atingido, o pipeline bloqueia a execução com motivo explícito no status.

### CI/CD e Runner Automático

Para ativar deploy e runner no GitHub Actions, configure os secrets do repositório:

```
SUPABASE_ACCESS_TOKEN=<personal-access-token>
SUPABASE_PROJECT_REF=emeeklwuvemhqiglsect
SUPABASE_URL=https://emeeklwuvemhqiglsect.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SCHOOL_FACTORY_ADMIN_PASSWORD=<mesma-senha-do-ADMIN_PASSWORD>
```

Secrets opcionais para modo híbrido via CI:

```
DOMAIN_DATA_BACKEND=hybrid
MONGO_DATA_API_BASE_URL=...
MONGO_DATA_API_KEY=...
MONGO_DATA_SOURCE=...
MONGO_DATA_DATABASE=...
MONGO_PROJECTS_COLLECTION=school_factory_projects
MONGO_TASKS_COLLECTION=school_factory_tasks
```

Secrets recomendados para pipeline de vídeo em produção:

```
XAI_API_KEY=<xai-api-key>
HEYGEN_API_KEY=<heygen-api-key>
HEYGEN_AVATAR_ID=<heygen-avatar-id>
HEYGEN_VOICE_ID=<heygen-voice-id>
TAVUS_API_KEY=<tavus-api-key>
TAVUS_REPLICA_ID=<tavus-replica-id>
TAVUS_BASE_URL=https://tavusapi.com/v2
```

## Build

```sh
npm run build
npm run preview
```

Build específico por produto:

```sh
npm run build:vibe
npm run build:white-label
```
