# Beepd — Copilot Instructions

## Project Overview

Beepd is a privacy-first proximity sharing app. This monorepo contains:

- `apps/api` — Cloudflare Workers API (Hono, Drizzle, D1)
- `apps/web` — Web app (Vite, React, Tailwind, shadcn/ui)
- `apps/site` — Marketing site (Astro, Tailwind)
- `apps/mobile` — Mobile app (Expo, React Native)
- `packages/*` — Shared code (ui, ui-native, shared, config)

## Key Documentation

- [docs/SPEC.md](../docs/SPEC.md) — Complete technical specification
- [docs/CHANGELOG.md](../docs/CHANGELOG.md) — Release history
- [MAINTAINING.md](../MAINTAINING.md) — Contributor guide

## Code Conventions

- TypeScript strict mode everywhere
- Zod for validation, infer types from schemas
- Drizzle for D1 database access
- Hono for API routing
- shadcn/ui + Radix for web components
- Tailwind for styling

## Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Run all apps
pnpm build        # Build all apps
pnpm typecheck    # Type check
pnpm lint         # Lint
pnpm test         # Run tests
```

## When Generating Code

- Follow existing patterns in the codebase
- Use absolute imports from package aliases
- Add Zod schemas for all API inputs/outputs
- Keep components small and composable
- Prefer server-side logic in Workers over client-side

