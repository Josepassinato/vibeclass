# Plano de Migracao: Vite SPA → Next.js 15

## Status: PLANEJADO (nao iniciado)
## Prioridade: BAIXA
## Branch: `feature/nextjs-migration`

## Motivacao
- SSR para paginas publicas (catalogo, landing) — melhor SEO
- SSG com revalidate para conteudo semi-estatico
- CSR para dashboards autenticados (aluno/admin)

## Fases da Migracao

### Fase A: Setup (1-2 dias)
1. Criar branch `feature/nextjs-migration`
2. `npm install next@15 --save`
3. Remover `vite`, `@vitejs/plugin-react-swc`, `react-router-dom`
4. Criar `next.config.ts` com Turbopack
5. Converter `VITE_*` env vars para `NEXT_PUBLIC_*`
6. Mover `index.html` para `app/layout.tsx`

### Fase B: Rotas (2-3 dias)
7. Converter rotas react-router para App Router file-based:
   - `/` → `app/page.tsx` (SSG landing)
   - `/login` → `app/login/page.tsx` (CSR)
   - `/aluno` → `app/aluno/page.tsx` ('use client')
   - `/aluno/dashboard` → `app/aluno/dashboard/page.tsx` ('use client')
   - `/admin` → `app/admin/page.tsx` ('use client')
   - `/admin/analytics` → `app/admin/analytics/page.tsx` ('use client')
8. Mover `<BrowserRouter>` logic para layout.tsx
9. Converter `useNavigate()` → `useRouter()` de `next/navigation`

### Fase C: Supabase SSR (1 dia)
10. Instalar `@supabase/ssr`
11. Criar Supabase client para Server Components
12. Middleware para refresh de tokens

### Fase D: Funcionalidades (2-3 dias)
13. Verificar que todos os hooks 'use client' funcionam
14. Mover assets estaticos para `public/`
15. Configurar `next/image` para otimizacao
16. Meta tags / Open Graph via `metadata` export

### Fase E: Testes (1-2 dias)
17. Rodar todos os testes existentes
18. Testar fluxo completo: login → aula → quiz → missao
19. Verificar PWA continua funcionando
20. Performance: Lighthouse antes/depois

## Riscos
- **ALTO**: Quebrar funcionalidades existentes (WebSocket, audio, video)
- **MEDIO**: Incompatibilidade de libs (next-themes, sonner, etc)
- **BAIXO**: Perda de performance no CSR dashboard

## Decisao
Fazer SOMENTE quando todas as outras fases (1-3) estiverem estabilizadas em producao.
