# Developer Setup Guide

This guide covers everything you need to get Beepd running locally for development.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.x LTS | JavaScript runtime |
| **pnpm** | 9.x | Package manager |
| **Git** | Latest | Version control |
| **Wrangler** | Latest | Cloudflare Workers CLI |
| **Expo CLI** | Latest | Mobile development |

### Optional Tools

| Tool | Purpose |
|------|---------|
| **VS Code** | Recommended IDE |
| **Docker** | For containerized development |
| **iOS Simulator** | iOS mobile testing (macOS only) |
| **Android Studio** | Android mobile testing |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/beepd.git
cd beepd

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Set up the database
pnpm --filter backend db:generate
pnpm --filter backend db:migrate

# 5. Start all services
pnpm dev
```

This starts:
- **Backend**: http://localhost:8787 (Wrangler dev server)
- **Web**: http://localhost:4321 (Astro dev server)
- **Mobile**: Expo development server (scan QR code)

---

## Detailed Setup

### 1. Install Prerequisites

#### Node.js (via nvm)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

#### pnpm

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

#### Wrangler (Cloudflare CLI)

```bash
# Install globally
npm install -g wrangler

# Login to Cloudflare (required for D1)
wrangler login
```

#### Expo CLI

```bash
# Install globally
npm install -g expo-cli eas-cli

# Login to Expo (optional, required for EAS builds)
eas login
```

### 2. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/beepd.git
cd beepd

# Install all dependencies (workspace packages included)
pnpm install
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env.local
```

Edit `.env.local` with your values:

```bash
# ===================
# Backend (Cloudflare Workers)
# ===================
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENCRYPTION_KEY=your-32-byte-encryption-key

# ===================
# Web (Astro)
# ===================
PUBLIC_API_URL=http://localhost:8787
PUBLIC_APP_URL=http://localhost:4321
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# ===================
# Mobile (Expo)
# ===================
EXPO_PUBLIC_API_URL=http://localhost:8787
EAS_PROJECT_ID=your-eas-project-id
```

#### Generating Secrets

```bash
# Generate a JWT secret
openssl rand -base64 32

# Generate an encryption key
openssl rand -hex 16
```

### 4. Database Setup

Beepd uses Cloudflare D1 with Drizzle ORM.

#### Local Development (Miniflare)

For local development, Wrangler creates a local SQLite database automatically:

```bash
# Generate migration files from schema
pnpm --filter backend db:generate

# Apply migrations to local D1
pnpm --filter backend db:migrate

# (Optional) Open Drizzle Studio to browse data
pnpm --filter backend db:studio
```

#### Remote D1 (Preview/Production)

```bash
# Create a new D1 database
wrangler d1 create beepd

# Note the database ID and update wrangler.toml

# Apply migrations to remote
wrangler d1 migrations apply beepd --remote
```

---

## Development Commands

### Root Commands (Monorepo)

Run from the repository root:

```bash
# Start all apps in development mode
pnpm dev

# Build all packages and apps
pnpm build

# Lint all packages
pnpm lint

# Run all tests
pnpm test

# Type check all packages
pnpm typecheck

# Format code with Prettier
pnpm format
```

### App-Specific Commands

#### Backend (Cloudflare Workers)

```bash
# Start development server
pnpm --filter backend dev

# Run tests
pnpm --filter backend test

# Generate database migrations
pnpm --filter backend db:generate

# Apply migrations (local)
pnpm --filter backend db:migrate

# Apply migrations (remote)
pnpm --filter backend db:migrate:remote

# Open Drizzle Studio
pnpm --filter backend db:studio

# Deploy to Cloudflare
pnpm --filter backend deploy
```

#### Web (Astro)

```bash
# Start development server
pnpm --filter web dev

# Build for production
pnpm --filter web build

# Preview production build
pnpm --filter web preview

# Run E2E tests
pnpm --filter web test:e2e
```

#### Mobile (Expo)

```bash
# Start Expo development server
pnpm --filter mobile start

# Start iOS simulator
pnpm --filter mobile ios

# Start Android emulator
pnpm --filter mobile android

# Build development client
pnpm --filter mobile build:dev

# Build preview APK/IPA
pnpm --filter mobile build:preview

# Build production
pnpm --filter mobile build:prod
```

---

## Project Structure

```
beepd/
├── apps/
│   ├── backend/          # Cloudflare Workers API
│   ├── web/              # Astro marketing site
│   └── mobile/           # Expo React Native app
├── packages/
│   ├── ui/               # Shared React components
│   ├── api-client/       # Typed API client
│   └── shared/           # Shared utilities
├── turbo.json            # Turborepo config
├── pnpm-workspace.yaml   # pnpm workspace config
└── .env.local            # Local environment variables
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed structure.

---

## Common Development Tasks

### Adding a New API Endpoint

1. Define the route in `apps/backend/src/routes/`
2. Add TypeScript types to `packages/api-client/src/types.ts`
3. Add the client method to `packages/api-client/src/client.ts`
4. Write tests in `apps/backend/src/__tests__/`

### Adding a New React Component

1. Create the component in `packages/ui/src/components/`
2. Export from `packages/ui/src/index.ts`
3. Use in web: `import { Component } from '@beepd/ui'`
4. Use in mobile: `import { Component } from '@beepd/ui'`

### Adding a Database Migration

1. Update the schema in `apps/backend/db/schema.ts`
2. Generate migration: `pnpm --filter backend db:generate`
3. Review the generated SQL in `apps/backend/db/migrations/`
4. Apply locally: `pnpm --filter backend db:migrate`

### Testing API Endpoints

```bash
# Start the backend server
pnpm --filter backend dev

# In another terminal, make requests
curl http://localhost:8787/auth/register -X POST

# Or use the API client in tests
pnpm --filter backend test
```

---

## IDE Setup

### VS Code

Recommended extensions:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "astro-build.astro-vscode",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "expo.vscode-expo-tools"
  ]
}
```

Recommended settings:

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## Troubleshooting

### "Cannot find module '@beepd/ui'"

```bash
# Rebuild packages
pnpm build --filter @beepd/ui

# Or rebuild all
pnpm build
```

### Wrangler D1 errors

```bash
# Make sure you're logged in
wrangler login

# Check your wrangler.toml has correct database_id
```

### Expo build failures

```bash
# Clear cache
expo start --clear

# Or completely reset
rm -rf node_modules/.cache
pnpm install
```

### Port already in use

```bash
# Kill process on port 8787 (backend)
lsof -ti:8787 | xargs kill -9

# Kill process on port 4321 (web)
lsof -ti:4321 | xargs kill -9
```

### TypeScript errors after package changes

```bash
# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or rebuild all packages
pnpm build
```

---

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details
- Read [API.md](./API.md) for API endpoint documentation
- Read [TESTING.md](./TESTING.md) for testing guidelines
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions
