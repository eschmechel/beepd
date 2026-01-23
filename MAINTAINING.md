# Maintaining Beepd

This guide covers development workflows, code standards, and release processes.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Wrangler CLI (for Cloudflare Workers)
- Expo CLI (for mobile development)

## Development Setup

```bash
# Clone and install
git clone https://github.com/beepd/beepd.git
cd beepd
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start development servers
pnpm dev
```

## Project Structure

| Path                 | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `apps/api`           | Cloudflare Workers API — routes, middleware, D1 schema |
| `apps/web`           | Vite React app — pages, components, hooks              |
| `apps/site`          | Astro marketing site — pages, blog content             |
| `apps/mobile`        | Expo app — screens, navigation, native modules         |
| `packages/ui`        | Web component library (shadcn/ui based)                |
| `packages/ui-native` | React Native component library                         |
| `packages/shared`    | Shared types, Zod schemas, API client                  |
| `packages/config`    | ESLint, TypeScript, Tailwind, Prettier configs         |
| `docs/`              | Technical specification and changelog                  |

## Code Standards

### TypeScript

- Strict mode enabled (`tsconfig.base.json`)
- Prefer explicit return types on exported functions
- Use Zod for runtime validation, infer types from schemas

### Linting

```bash
pnpm lint        # Run ESLint across all packages
pnpm lint:fix    # Auto-fix issues
```

### Formatting

```bash
pnpm format      # Run Prettier
```

### Type Checking

```bash
pnpm typecheck   # Run tsc --noEmit across all packages
```

## Testing

```bash
pnpm test        # Run all tests
pnpm test:api    # API tests only (Vitest)
pnpm test:web    # Web tests only (Vitest + Testing Library)
```

## Database Migrations

```bash
cd apps/api

# Create a new migration
pnpm drizzle-kit generate

# Apply migrations locally
pnpm wrangler d1 migrations apply beepd-db --local

# Apply to production
pnpm wrangler d1 migrations apply beepd-db --remote
```

## Deployment

### API (Cloudflare Workers)

```bash
cd apps/api
pnpm wrangler deploy
```

### Web App (Cloudflare Pages or Vercel)

```bash
cd apps/web
pnpm build
# Deploy via CI or manually
```

### Marketing Site (Cloudflare Pages)

```bash
cd apps/site
pnpm build
# Deploy via CI
```

### Mobile (EAS Build)

```bash
cd apps/mobile
eas build --platform all
eas submit --platform all
```

## Branching Strategy

| Branch      | Purpose                         |
| ----------- | ------------------------------- |
| `main`      | Production-ready code           |
| `develop`   | Integration branch for features |
| `feature/*` | New features                    |
| `fix/*`     | Bug fixes                       |
| `release/*` | Release preparation             |

## Pull Request Process

1. Create feature branch from `develop`
2. Make changes with atomic commits
3. Ensure `pnpm lint && pnpm typecheck && pnpm test` pass
4. Open PR against `develop`
5. Request review from maintainer
6. Squash merge after approval

## Release Process

1. Create `release/vX.Y.Z` branch from `develop`
2. Update version in root `package.json`
3. Update `docs/CHANGELOG.md` with release notes
4. Merge to `main` via PR
5. Tag release: `git tag vX.Y.Z && git push --tags`
6. Deploy all apps
7. Merge `main` back to `develop`

## Documentation

- **[docs/SPEC.md](docs/SPEC.md)** — Single source of truth for technical details
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** — All notable changes

When updating documentation:

1. Keep SPEC.md comprehensive and current
2. Update CHANGELOG.md for every release
3. Update README.md if project structure changes

## Security

Report vulnerabilities to [security@beepd.app](mailto:security@beepd.app). See [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [MIT License](LICENSE).
