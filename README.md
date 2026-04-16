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
