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
