# Beepd

**Privacy-first location sharing for friends.**

Beepd helps friends discover when they're near each other - intentionally. Users opt-in to share their live location and receive alerts when friends enter a configurable radius. No tracking history, no surveillance - just spontaneous meetups.

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, tech stack, data flows |
| [Database](docs/DATABASE.md) | Schema, ERD, queries, data retention |
| [API](docs/API.md) | Endpoints, examples, error codes |
| [Frontend](docs/FRONTEND.md) | Astro, React islands, state management |
| [Mobile](docs/MOBILE.md) | Expo, React Native, location handling |
| [Security](docs/SECURITY.md) | Auth, GDPR, privacy protections |
| [Setup](docs/SETUP.md) | Developer onboarding guide |
| [Deployment](docs/DEPLOYMENT.md) | CI/CD, environments, Cloudflare config |
| [Testing](docs/TESTING.md) | Testing strategy and examples |
| [Monetization](docs/MONETIZATION.md) | Subscriptions, ads, pricing |
| [Contributing](CONTRIBUTING.md) | How to contribute |

## Core Features

- **Proximity Alerts**: Get notified when friends are nearby
- **Privacy Controls**: Choose who can see you (Friends Only / Everyone / Off)
- **Configurable Radius**: Set your detection range (100m - 5km)
- **No History**: Location data expires after 24 hours
- **Friend Codes**: Add friends without sharing personal info

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Cloudflare Workers + Hono + D1 + Drizzle |
| **Web** | Astro + React Islands + Tailwind + shadcn/ui |
| **Mobile** | Expo + Expo Router + NativeWind |
| **Tooling** | Turborepo + pnpm + Zustand + TanStack Query |

## Project Structure

```
beepd/
├── apps/
│   ├── backend/          # Cloudflare Workers API
│   ├── web/              # Astro marketing site + demo
│   └── mobile/           # Expo app (iOS + Android)
├── packages/
│   ├── ui/               # Shared React components + Zustand stores
│   ├── api-client/       # Typed API client
│   └── shared/           # Utilities, types, validation
└── docs/                 # Documentation
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/beepd.git
cd beepd
pnpm install

# Set up environment
cp .env.example .env.local

# Start all services
pnpm dev
```

This starts:
- **Backend**: http://localhost:8787
- **Web**: http://localhost:4321
- **Mobile**: Expo dev server (scan QR)

See [Setup Guide](docs/SETUP.md) for detailed instructions.

## Development Commands

```bash
pnpm dev              # Start all apps
pnpm build            # Build everything
pnpm test             # Run tests
pnpm lint             # Lint all packages
pnpm typecheck        # Type check

# App-specific
pnpm --filter backend dev
pnpm --filter web dev
pnpm --filter mobile start
```

## Platform Strategy

| Platform | Priority | Purpose |
|----------|----------|---------|
| iOS App | Primary | Main user experience |
| Android App | Primary | Main user experience |
| Marketing Site | Primary | SEO, investor showcase |
| Interactive Demo | Secondary | Try without installing |

## Status

**Version**: 2.0  
**Status**: Ready for Development

---

Built with privacy in mind.
