# Deployment Guide

This guide covers CI/CD pipelines, environment configuration, and deployment procedures for Beepd.

## Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| **Local** | Development | `localhost:8787` (API), `localhost:4321` (Web) |
| **Preview** | PR testing | `api-preview.beepd.tech`, `preview.beepd.tech` |
| **Production** | Live | `api.beepd.app`, `beepd.app` |

### Domain Strategy

| Domain | Purpose |
|--------|---------|
| **beepd.app** | User-facing (marketing, API) |
| **beepd.tech** | Developer/internal (preview, docs, status) |

---

## Infrastructure Overview

```
                    ┌─────────────────────────────────────┐
                    │         GitHub Actions CI/CD        │
                    └──────────────────┬──────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐            ┌───────────────┐            ┌───────────────┐
│   Backend     │            │     Web       │            │    Mobile     │
│   (Workers)   │            │   (Pages)     │            │   (EAS)       │
└───────┬───────┘            └───────┬───────┘            └───────┬───────┘
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐            ┌───────────────┐            ┌───────────────┐
│  Cloudflare   │            │  Cloudflare   │            │  App Store    │
│   Workers     │            │    Pages      │            │  Play Store   │
└───────────────┘            └───────────────┘            └───────────────┘
```

---

## CI/CD Pipelines

### Main CI Pipeline

Runs on every push and pull request.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

### Preview Deployment Pipeline

Deploys preview environments for pull requests.

```yaml
# .github/workflows/deploy-preview.yml
name: Deploy Preview

on:
  pull_request:
    branches: [develop]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter backend build
      - name: Deploy to Cloudflare Workers (Preview)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/backend
          command: deploy --env preview

  deploy-web:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web build
        env:
          PUBLIC_API_URL: https://api-preview.beepd.tech
      - name: Deploy to Cloudflare Pages (Preview)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/web
          command: pages deploy dist --project-name beepd-web --branch ${{ github.head_ref }}
```

### Production Deployment Pipeline

Deploys to production when merging to `main`.

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter backend build
      
      # Run database migrations first
      - name: Run D1 Migrations
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/backend
          command: d1 migrations apply beepd --remote
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/backend
          command: deploy

  deploy-web:
    runs-on: ubuntu-latest
    needs: deploy-backend
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web build
        env:
          PUBLIC_API_URL: https://api.beepd.app
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/web
          command: pages deploy dist --project-name beepd-web --branch main
```

---

## Cloudflare Configuration

### Backend Worker (wrangler.toml)

```toml
# apps/backend/wrangler.toml
name = "beepd-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "beepd"
database_id = "your-database-id"

# Preview environment
[env.preview]
name = "beepd-api-preview"
[env.preview.vars]
ENVIRONMENT = "preview"

[[env.preview.d1_databases]]
binding = "DB"
database_name = "beepd-preview"
database_id = "your-preview-database-id"

# Cron triggers for cleanup
[triggers]
crons = [
  "0 * * * *",      # Hourly: cleanup expired locations
  "*/15 * * * *",   # Every 15min: cleanup proximity events
]
```

### Web (Astro + Cloudflare Pages)

```toml
# apps/web/wrangler.toml
name = "beepd-web"
compatibility_date = "2024-01-01"
pages_build_output_dir = "./dist"

[vars]
ENVIRONMENT = "production"

# Access D1 for SSR blog routes
[[d1_databases]]
binding = "DB"
database_name = "beepd"
database_id = "your-database-id"
```

### Astro Configuration

```javascript
// apps/web/astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'hybrid', // Static by default, SSR where needed
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    react(),
    tailwind(),
  ],
  vite: {
    resolve: {
      alias: {
        '@beepd/ui': '../../packages/ui/src',
        '@beepd/api-client': '../../packages/api-client/src',
      },
    },
  },
});
```

---

## Environment Variables

### Required Secrets (GitHub Actions)

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers/Pages permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `JWT_SECRET` | JWT signing secret (production) |
| `EXPO_TOKEN` | Expo access token for EAS builds |

### Setting Secrets

```bash
# Via GitHub CLI
gh secret set CLOUDFLARE_API_TOKEN --body "your-token"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "your-account-id"
gh secret set JWT_SECRET --body "your-jwt-secret"
```

### Environment-Specific Variables

| Variable | Local | Preview | Production |
|----------|-------|---------|------------|
| `PUBLIC_API_URL` | `http://localhost:8787` | `https://api-preview.beepd.tech` | `https://api.beepd.app` |
| `PUBLIC_APP_URL` | `http://localhost:4321` | `https://preview.beepd.tech` | `https://beepd.app` |
| `ENVIRONMENT` | `development` | `preview` | `production` |

---

## Mobile Deployment (EAS)

### EAS Build Configuration

```json
// apps/mobile/eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json"
      }
    }
  }
}
```

### Build Commands

```bash
# Development build (internal testing)
eas build --platform all --profile development

# Preview build (TestFlight / Internal Testing)
eas build --platform all --profile preview

# Production build
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Mobile CI/CD Pipeline

```yaml
# .github/workflows/deploy-mobile.yml
name: Deploy Mobile

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'
      - 'packages/**'

jobs:
  build-ios:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: pnpm install --frozen-lockfile
      - run: eas build --platform ios --profile production --non-interactive
        working-directory: apps/mobile

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: pnpm install --frozen-lockfile
      - run: eas build --platform android --profile production --non-interactive
        working-directory: apps/mobile
```

---

## Database Migrations

### Applying Migrations

```bash
# Local development (automatic with Miniflare)
pnpm --filter backend db:migrate

# Preview environment
wrangler d1 migrations apply beepd-preview --remote --env preview

# Production (run from CI/CD)
wrangler d1 migrations apply beepd --remote
```

### Migration Best Practices

1. **Never modify existing migrations** - Create new migrations instead
2. **Test migrations locally** before deploying
3. **Back up production data** before major schema changes
4. **Use transactions** for multi-statement migrations
5. **Run migrations before code deployment** in CI/CD

---

## DNS Configuration

### Required DNS Records

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `app` | `beepd-web.pages.dev` | Yes |
| CNAME | `api` | `beepd-api.workers.dev` | Yes |
| CNAME | `preview` | `beepd-web.pages.dev` | Yes |
| CNAME | `api-preview` | `beepd-api-preview.workers.dev` | Yes |

---

## Monitoring & Logging

### Cloudflare Analytics

- Workers analytics: Cloudflare Dashboard > Workers > Your Worker > Analytics
- Pages analytics: Cloudflare Dashboard > Pages > Your Project > Analytics

### Log Access

```bash
# Tail Worker logs in real-time
wrangler tail beepd-api

# Tail preview Worker logs
wrangler tail beepd-api-preview --env preview
```

### Custom Logging

```typescript
// In Worker code
console.log(JSON.stringify({
  level: 'info',
  message: 'User registered',
  userId: user.id,
  timestamp: Date.now(),
}));
```

---

## Rollback Procedures

### Rolling Back Workers

```bash
# List recent deployments
wrangler deployments list

# Rollback to previous deployment
wrangler rollback

# Rollback to specific deployment
wrangler rollback --deployment-id <deployment-id>
```

### Rolling Back Pages

```bash
# Rollback via Cloudflare Dashboard
# Pages > Project > Deployments > Select previous deployment > "Make production"
```

### Database Rollback

1. Create a backup before migration
2. Write a reverse migration script
3. Apply the reverse migration

```bash
# There's no automatic rollback - plan migrations carefully!
```

---

## Security Checklist

Before deploying to production:

- [ ] All secrets stored in GitHub Secrets (never in code)
- [ ] HTTPS enforced (automatic with Cloudflare)
- [ ] CORS configured for known origins only
- [ ] Rate limiting enabled on API
- [ ] CSP headers configured on web
- [ ] JWT expiry set appropriately (7 days)
- [ ] No debug/development flags in production
- [ ] Database backups configured

---

## Cost Management

### Cloudflare Free Tier Limits

| Service | Free Tier | Overage Cost |
|---------|-----------|--------------|
| Workers | 100K requests/day | $0.50/million |
| D1 | 5M reads/day, 100K writes/day | $0.75/million reads |
| Pages | Unlimited sites, 500 builds/mo | $0 (no overage) |

### Monitoring Usage

```bash
# Check Workers usage
wrangler metrics

# Check D1 usage
# Cloudflare Dashboard > D1 > Database > Metrics
```

---

## Troubleshooting

### Deployment Failures

```bash
# Check CI logs in GitHub Actions

# Check Wrangler output
wrangler deploy --dry-run
```

### Worker Not Responding

1. Check Cloudflare Dashboard for errors
2. Tail logs: `wrangler tail`
3. Verify routes in `wrangler.toml`
4. Check environment variables are set

### Pages Build Failures

1. Check build logs in Cloudflare Dashboard
2. Verify `astro.config.mjs` adapter configuration
3. Ensure all dependencies are in `package.json`

---

## Next Steps

- Read [SETUP.md](./SETUP.md) for local development
- Read [TESTING.md](./TESTING.md) for testing guidelines
- Read [SECURITY.md](./SECURITY.md) for security details
