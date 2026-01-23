# Beepd

> Privacy-first proximity sharing for friends and groups.

Beepd is a mobile-first app that lets you share your location with friends and group members on your terms. One-way sharing, enter-only notifications, and granular privacy controls.

## Quick Start

```bash
# Install dependencies
pnpm install

# Development
pnpm dev          # Run all apps in parallel
pnpm dev:api      # API only (Cloudflare Workers)
pnpm dev:web      # Web app only (Vite)
pnpm dev:site     # Marketing site only (Astro)
pnpm dev:mobile   # Mobile app only (Expo)

# Build
pnpm build        # Build all apps
pnpm typecheck    # Type check all packages

# Deploy
pnpm deploy:api   # Deploy API to Cloudflare
```

## Repository Structure

```text
beepd/
├── apps/
│   ├── api/          # Cloudflare Workers API (Hono + Drizzle)
│   ├── web/          # Web application (Vite + React)
│   ├── site/         # Marketing site & blog (Astro)
│   └── mobile/       # Mobile app (Expo + React Native)
├── packages/
│   ├── ui/           # Shared web components (shadcn/ui + Radix)
│   ├── ui-native/    # Shared mobile components
│   ├── shared/       # Types, Zod schemas, API client
│   └── config/       # Shared ESLint, TypeScript, Tailwind configs
├── docs/
│   ├── SPEC.md       # Complete technical specification
│   └── CHANGELOG.md  # Release history
├── SECURITY.md       # Vulnerability reporting
├── MAINTAINING.md    # Contributor guide
└── LICENSE           # MIT License
```

## Domains

| Domain           | Purpose                   |
| ---------------- | ------------------------- |
| `api.beepd.tech` | API, health checks, admin |
| `beepd.app`      | Marketing site, blog      |
| `app.beepd.app`  | Web application           |

## Tech Stack

| Layer   | Technology                                             |
| ------- | ------------------------------------------------------ |
| Backend | Cloudflare Workers, Hono, Drizzle, D1, DO, R2, KV      |
| Web     | Vite, React, Tailwind, shadcn/ui, Radix, Framer Motion |
| Site    | Astro, Tailwind                                        |
| Mobile  | Expo, React Native, MapLibre                           |
| Maps    | MapLibre GL, MapTiler / OpenStreetMap                  |

## Documentation

- [Technical Specification](docs/SPEC.md) — Architecture, API, data model, features
- [Changelog](docs/CHANGELOG.md) — Release history
- [Security Policy](SECURITY.md) — Reporting vulnerabilities
- [Maintainer Guide](MAINTAINING.md) — Contributing and releasing

## License

[MIT](LICENSE) © 2026 Beepd
