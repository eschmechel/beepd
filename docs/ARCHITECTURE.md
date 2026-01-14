# Architecture

> System design, tech stack, and data flows for Beepd.

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USERS                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  iOS App    │  │ Android App │  │ Marketing   │  │ Interactive │      │
│  │  (Expo)     │  │  (Expo)     │  │ Site (Web)  │  │ Demo (Web)  │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
└─────────┼────────────────┼────────────────┼────────────────┼─────────────┘
          │                │                │                │
          └────────────────┼────────────────┼────────────────┘
                           │                │
              ┌────────────▼────────────────▼────────────┐
              │         Cloudflare Global Network         │
              │  ┌─────────────────────────────────────┐  │
              │  │           Cloudflare DNS             │  │
│  │   beepd.app                          │  │
│  │   api.beepd.app                      │  │
              │  └─────────────────────────────────────┘  │
              └───────────────────┬───────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────▼─────────┐   ┌────────▼────────┐   ┌─────────▼─────────┐
│  Cloudflare Pages │   │ Cloudflare      │   │ Cloudflare D1     │
│  ─────────────────│   │ Workers (API)   │   │ ─────────────────│
│  - Astro (SSR)    │   │ ───────────────│   │  - Users          │
│  - React Islands  │   │  - Auth         │   │  - Locations      │
│  - Static Assets  │   │  - Location     │   │  - Friendships    │
│  - Blog (SSR)     │   │  - Friends      │   │  - Posts (Blog)   │
└───────────────────┘   │  - GDPR         │   │  - Consent        │
                        │  - Blog API     │   └───────────────────┘
                        └─────────────────┘
```

## Tech Stack

### Backend

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Cloudflare Workers | Edge computing, zero cold starts |
| Framework | Hono | Fast, lightweight web framework |
| Database | Cloudflare D1 | Serverless SQLite at the edge |
| ORM | Drizzle | Type-safe SQL queries |
| Auth | JWT | Stateless authentication |

### Web (Marketing Site)

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Astro 4.x | Static + SSR hybrid rendering |
| UI Components | React 18 | Interactive islands |
| Styling | Tailwind CSS | Utility-first CSS |
| Component Library | shadcn/ui | Accessible React components |
| State Management | Zustand | Client-side state |
| Server State | TanStack Query | API data fetching/caching |
| Maps | React-Leaflet | Interactive maps (web) |

### Mobile

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Expo SDK 52+ | React Native tooling |
| Router | Expo Router | File-based navigation |
| UI | NativeWind | Tailwind for React Native |
| Maps | react-native-maps | Native map components |
| Location | expo-location | GPS access |
| Notifications | expo-notifications | Push notifications |
| Build | EAS Build | Cloud builds for iOS/Android |

### Tooling

| Tool | Purpose |
|------|---------|
| Turborepo | Monorepo build orchestration |
| pnpm | Fast, efficient package manager |
| TypeScript | Type safety across all packages |
| Vitest | Unit and integration testing |
| Playwright | E2E testing (web) |

## Monorepo Structure

```
beepd/
├── turbo.json                    # Turborepo pipeline config
├── package.json                  # Root workspace
├── pnpm-workspace.yaml           # Workspace definition
│
├── apps/
│   ├── mobile/                   # Expo app (iOS + Android)
│   │   ├── app/                  # Expo Router pages
│   │   ├── components/           # Mobile-specific components
│   │   ├── package.json
│   │   ├── app.json
│   │   └── eas.json              # EAS Build config
│   │
│   ├── web/                      # Astro marketing site + demo
│   │   ├── src/
│   │   │   ├── pages/            # Astro pages (static + SSR)
│   │   │   ├── components/       # Astro + React components
│   │   │   └── layouts/          # Page layouts
│   │   ├── astro.config.mjs
│   │   └── package.json
│   │
│   └── backend/                  # Cloudflare Workers API
│       ├── src/
│       ├── db/
│       ├── wrangler.toml
│       └── package.json
│
├── packages/
│   ├── ui/                       # Shared React components
│   │   ├── src/
│   │   │   ├── components/       # Button, Card, Toggle, etc.
│   │   │   ├── stores/           # Zustand stores
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api-client/               # Typed API client (shared)
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   └── shared/                   # Shared utilities/types
│       ├── src/
│       │   ├── geolocation.ts
│       │   ├── validation.ts
│       │   └── types.ts
│       └── package.json
│
└── docs/                         # Documentation
```

## Backend Services

| Service | Purpose | Dependencies |
|---------|---------|--------------|
| Auth Worker | Registration, login, JWT issuance | D1, JWT |
| Location Worker | Location updates, proximity calculation | D1, geolib |
| Friends Worker | Friend management, invite codes | D1 |
| Blog Worker | Blog posts CRUD, markdown rendering | D1, marked |
| Cleanup Worker | TTL cleanup via Cron | D1 |

## Data Flows

### Location Update Flow

```
User Location Update Flow:
1. User enables sharing mode → Consent check
2. Browser/device gets location (GPS or manual)
3. PUT /me/location → Cloudflare Worker
4. Worker validates JWT, checks consent
5. Update D1 locations table with 24h TTL
6. Trigger proximity recalculation
7. Return success to user
8. Polling users receive updated nearby list
```

### Proximity Detection Flow

```
Proximity Detection Flow:
1. User calls GET /nearby
2. Worker looks up user's mode and radius
3. Query locations table (expires_at > now)
4. Filter by radius using Haversine formula
5. Filter by mode (FRIENDS_ONLY vs EVERYONE)
6. Apply blocking rules
7. Check proximity_events for new entries
8. Return nearby list + new alerts
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend Runtime | Cloudflare Workers | Zero cold starts, edge execution |
| Database | D1 | Native Cloudflare integration, SQLite simplicity |
| API Style | REST | Simpler than GraphQL for mobile + demo |
| Real-time | Polling | Simpler than WebSocket, stateless workers |
| Auth | Device Secret + JWT | No PII required, instant registration |
| Web Framework | Astro | Zero JS by default, islands for interactivity |
| Mobile Framework | Expo | Zero native config, EAS Build |
| Monorepo | Turborepo | Fast builds, excellent pnpm support |
| State | Zustand | No providers, works in Astro islands |

See also:
- [Database Schema](DATABASE.md)
- [API Design](API.md)
- [Frontend Architecture](FRONTEND.md)
- [Mobile Architecture](MOBILE.md)
