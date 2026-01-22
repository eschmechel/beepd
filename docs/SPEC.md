<!-- markdownlint-disable MD051 MD060 -->

# Beepd — Technical Specification

> Privacy-first proximity sharing for friends and groups.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Data Model](#data-model)
6. [API Reference](#api-reference)
7. [Authentication & Security](#authentication--security)
8. [Features](#features)
9. [User Interface](#user-interface)
10. [Pricing & Entitlements](#pricing--entitlements)
11. [Roadmap](#roadmap)

---

## Overview

**Beepd** is a mobile-first proximity app that enables one-way location sharing between friends and group members. Unlike always-on trackers, Beepd uses opt-in leases, privacy zones (Places), and enter-only notifications to respect user boundaries while keeping people connected.

### Domains

| Domain | Purpose |
|--------|---------|
| `api.beepd.tech` | Critical API, health checks, admin endpoints |
| `beepd.app` | Marketing site and blog |
| `app.beepd.app` | Web application |

### Key Principles

- **Privacy by default** — Location is never shared without explicit opt-in via lease activation.
- **One-way sharing** — You see friends who share with you; they see you only if you also share.
- **Enter-only notifications** — Alerts fire only when someone enters your proximity, not continuously.
- **Granular policies** — Per-friend and per-group visibility controls with precedence rules.

---

## Core Concepts

### Visibility & Proximity Radii

| Radius | Abbreviation | Default | Range | Description |
|--------|--------------|---------|-------|-------------|
| Visibility Precision Radius | VPR | 250m | 50m–1km | Distance within which your exact location is visible |
| Proximity Enter Radius | PER | 100m | 50m–VPR | Distance that triggers an enter notification |

**Effective PER** = `min(viewer.PER, target.PER, effective.VPR)`

### Eligibility

A user can see another user's location if:

1. They are **friends**, OR
2. They are **members of a shared group** where both have location enabled

### Policy Precedence

1. **Friend-specific policy** (highest priority)
2. **Most-permissive applicable group policy**
3. **User's global policy** (fallback)

Per-group overrides exclude that group from the "most-permissive" calculation.

### Leases

A **lease** is an active location-sharing session. When a user activates sharing:

1. Client requests `POST /v1/location/lease`
2. Server creates/extends lease in `UserStateDO`
3. Client publishes location updates to `POST /v1/location/publish`
4. Lease expires after TTL (24h default) or manual stop

Last-known location persists for 24 hours after lease expiry, then is purged.

### Places (Concept)

**Places** are user-defined geographic zones with custom privacy behavior:

- **Suppress notifications** — No enter alerts when you're at this place (default)
- **Hide location** — Show coarse cell instead of precise pin
- **Ghost** — Appear completely offline to selected users/groups
- **Label sharing** — Optionally share "At Work" or "At Home" labels

Free tier: 4 places. Plus tier: unlimited.

### Groups vs Circle

| Feature | Groups | Circle |
|---------|--------|--------|
| Max members | 50 (communities in v1.1 expand this) | 5 |
| Governance | Owner/admin hierarchy | Majority vote (kick/ban/invite) |
| Use case | Friend groups, teams | Family, close friends with equal control |
| Billing | Group Plan (5 seats shared) | Part of group plan |

---

## Architecture

### High-Level Diagram

```text
┌─────────────┐     ┌─────────────────────────────────────────────────────┐
│   Mobile    │     │              Cloudflare Edge                        │
│  (Expo/RN)  │────▶│  ┌─────────┐  ┌────────┐  ┌────────┐  ┌──────────┐ │
├─────────────┤     │  │ Workers │  │   D1   │  │   DO   │  │    R2    │ │
│    Web      │────▶│  │  (Hono) │  │ (SQL)  │  │(State) │  │ (Blobs)  │ │
│  (React)    │     │  └────┬────┘  └────────┘  └────────┘  └──────────┘ │
└─────────────┘     │       │                                             │
                    │  ┌────▼────┐  ┌────────┐  ┌────────┐               │
                    │  │   KV    │  │ Queues │  │ Hyperd.│               │
                    │  │(Config) │  │ (Async)│  │(Future)│               │
                    │  └─────────┘  └────────┘  └────────┘               │
                    └─────────────────────────────────────────────────────┘
```

### Durable Objects

| DO Class | Key Pattern | Purpose |
|----------|-------------|---------|
| `UserStateDO` | `user:{userId}` | Active lease, last-known location, publish state |
| `PairStateDO` | `pair:{sortedUserIds}` | Re-entry gate (15m cooldown), snooze state, refresh cooldown |

### Storage Strategy

| Store | Use Case |
|-------|----------|
| **D1** | Users, devices, sessions, relationships, groups, policies, places, calendars, entitlements |
| **DO** | Real-time lease state, pairwise proximity tracking |
| **KV** | Feature flags, configuration, rate limit counters |
| **R2** | Blog markdown content, user data exports |
| **Queues** | Async jobs: push notifications, export generation, audit logging |

---

## Technology Stack

### Backend

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers |
| Framework | Hono (lightweight, edge-native) |
| ORM | Drizzle (type-safe, D1-compatible) |
| Validation | Zod (runtime + static types) |
| Bundler | Wrangler (Workers toolchain) |

### Frontend — Web App

| Layer | Technology |
|-------|------------|
| Build | Vite |
| Framework | React 18 |
| Styling | Tailwind CSS |
| Components | shadcn/ui + Radix UI primitives |
| Animation | Framer Motion, animate-ui, Magic UI |
| Maps | MapLibre GL + MapTiler / OSM tiles |

### Frontend — Marketing Site

| Layer | Technology |
|-------|------------|
| Framework | Astro (SSR/SSG for SEO) |
| Styling | Tailwind CSS |
| Content | Markdown in R2 (dynamic blog) |

### Mobile

| Layer | Technology |
|-------|------------|
| Framework | Expo (React Native) |
| Build | EAS Build + Submit |
| Permissions | expo-location, expo-calendar, expo-sensors, expo-notifications |
| Maps | react-native-maplibre-gl |

---

## Data Model

### Core Tables

```sql
-- Users & authentication
users (
  id            UUID PRIMARY KEY,
  phone         TEXT UNIQUE,
  email         TEXT UNIQUE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  deleted_at    TIMESTAMP  -- soft delete
)

devices (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  push_token    TEXT,
  platform      TEXT CHECK (platform IN ('ios', 'android', 'web')),
  is_primary    BOOLEAN DEFAULT FALSE,
  last_seen_at  TIMESTAMP
)

sessions (
  id                  UUID PRIMARY KEY,
  user_id             UUID REFERENCES users(id),
  device_id           UUID REFERENCES devices(id),
  refresh_token_hash  TEXT NOT NULL,
  expires_at          TIMESTAMP NOT NULL,
  revoked_at          TIMESTAMP
)

-- Relationships
relationships (
  id            UUID PRIMARY KEY,
  user_a_id     UUID REFERENCES users(id),  -- smaller UUID
  user_b_id     UUID REFERENCES users(id),  -- larger UUID
  status        TEXT CHECK (status IN ('pending', 'accepted', 'blocked_by_a', 'blocked_by_b')),
  initiated_by  UUID REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id)
)

-- Groups & memberships
groups (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  is_circle   BOOLEAN DEFAULT FALSE,
  owner_id    UUID REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
)

memberships (
  id        UUID PRIMARY KEY,
  group_id  UUID REFERENCES groups(id),
  user_id   UUID REFERENCES users(id),
  role      TEXT CHECK (role IN ('owner', 'admin', 'mod', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
)

invites (
  id          UUID PRIMARY KEY,
  group_id    UUID REFERENCES groups(id),
  inviter_id  UUID REFERENCES users(id),
  invitee_id  UUID REFERENCES users(id),
  status      TEXT CHECK (status IN ('pending', 'accepted', 'denied', 'expired')) DEFAULT 'pending',
  created_at  TIMESTAMP DEFAULT NOW()
)

bans (
  id         UUID PRIMARY KEY,
  group_id   UUID REFERENCES groups(id),
  user_id    UUID REFERENCES users(id),
  banned_by  UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
)

-- Circle voting
votes (
  id          UUID PRIMARY KEY,
  group_id    UUID REFERENCES groups(id),
  action      TEXT CHECK (action IN ('invite', 'kick', 'ban', 'unban')),
  target_id   UUID REFERENCES users(id),
  proposer_id UUID REFERENCES users(id),
  status      TEXT CHECK (status IN ('open', 'passed', 'failed', 'expired')) DEFAULT 'open',
  created_at  TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP NOT NULL
)

vote_casts (
  id        UUID PRIMARY KEY,
  vote_id   UUID REFERENCES votes(id),
  user_id   UUID REFERENCES users(id),
  approve   BOOLEAN NOT NULL,
  cast_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(vote_id, user_id)
)

-- Policies
policies (
  id                    UUID PRIMARY KEY,
  owner_id              UUID REFERENCES users(id),
  scope                 TEXT CHECK (scope IN ('global', 'friend', 'group')),
  target_id             UUID,  -- friend user_id or group_id
  vpr                   INTEGER DEFAULT 250,
  per                   INTEGER DEFAULT 100,
  location_enabled      BOOLEAN DEFAULT TRUE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  exclude_from_permissive BOOLEAN DEFAULT FALSE,
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_id, scope, target_id)
)

-- Places & exceptions
places (
  id          UUID PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  name        TEXT NOT NULL,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  radius      INTEGER DEFAULT 100,
  behavior    TEXT CHECK (behavior IN ('suppress', 'coarse', 'ghost')) DEFAULT 'suppress',
  share_label BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
)

place_exceptions (
  id                UUID PRIMARY KEY,
  place_id          UUID REFERENCES places(id),
  scope             TEXT CHECK (scope IN ('user', 'group')),
  target_id         UUID NOT NULL,
  override_behavior TEXT CHECK (override_behavior IN ('suppress', 'coarse', 'ghost', 'none')),
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(place_id, scope, target_id)
)

-- Calendars & busy windows
calendars (
  id                UUID PRIMARY KEY,
  user_id           UUID REFERENCES users(id),
  provider          TEXT CHECK (provider IN ('eventkit', 'icloud', 'google', 'microsoft')),
  external_id       TEXT,
  access_token_enc  TEXT,
  refresh_token_enc TEXT,
  connected_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider, external_id)
)

selected_calendars (
  id          UUID PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  calendar_id UUID REFERENCES calendars(id),
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, calendar_id)
)

busy_windows (
  id        UUID PRIMARY KEY,
  user_id   UUID REFERENCES users(id),
  name      TEXT,
  rrule     TEXT,  -- iCal recurrence rule
  start_ts  TIMESTAMP,
  end_ts    TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Entitlements & grants
entitlements (
  id                     UUID PRIMARY KEY,
  user_id                UUID REFERENCES users(id),
  type                   TEXT CHECK (type IN ('plus', 'group_plan', 'lifetime')),
  stripe_subscription_id TEXT,
  expires_at             TIMESTAMP,
  created_at             TIMESTAMP DEFAULT NOW()
)

grants (
  id          UUID PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  type        TEXT CHECK (type IN ('student', 'low_income')),
  verified_at TIMESTAMP,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
)

-- Blog
blog_posts (
  id           UUID PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  r2_key       TEXT NOT NULL,  -- path in R2
  published_at TIMESTAMP,      -- NULL for drafts
  author_id    UUID REFERENCES users(id),
  created_at   TIMESTAMP DEFAULT NOW()
)
```

---

## API Reference

All versioned endpoints use prefix `/v1`. Health and admin endpoints are unversioned.

### Health & Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Liveness probe (returns 200 if worker alive) |
| GET | `/readyz` | Readiness probe (checks D1, DO connectivity) |
| GET | `/metrics` | Prometheus-format metrics |
| GET | `/admin` | Admin dashboard entry |
| GET | `/admin/logs` | Query observability logs |
| GET | `/admin/feature-flags` | List feature flags |
| PUT | `/admin/feature-flags` | Update feature flags |
| POST | `/admin/cache/invalidate` | Invalidate KV cache entries |
| POST | `/admin/jobs/replay` | Replay failed queue jobs |

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/start` | Start passwordless auth (email/phone/OAuth) |
| POST | `/v1/auth/verify` | Verify OTP or OAuth callback |
| POST | `/v1/auth/refresh` | Exchange refresh token for new access token |
| POST | `/v1/auth/logout` | Revoke current session |
| GET | `/v1/auth/me` | Get current user + session info |

### Users & Devices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/users/:id` | Get public profile |
| PUT | `/v1/users/me` | Update own profile |
| GET | `/v1/devices` | List own devices |
| PUT | `/v1/devices/:id/primary` | Set device as primary |
| PUT | `/v1/devices/push-token` | Update push token for current device |

### Friends

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/friends/request` | Send friend request |
| POST | `/v1/friends/accept` | Accept pending request |
| POST | `/v1/friends/deny` | Deny pending request |
| POST | `/v1/friends/remove` | Remove existing friend |
| POST | `/v1/friends/block` | Block user |
| POST | `/v1/friends/unblock` | Unblock user |
| GET | `/v1/friends` | List friends |
| GET | `/v1/friends/requests` | List pending requests (incoming + outgoing) |

### Groups

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/groups` | Create group |
| GET | `/v1/groups` | List own groups |
| GET | `/v1/groups/:id` | Get group details |
| PUT | `/v1/groups/:id` | Update group (name, avatar) |
| POST | `/v1/groups/:id/invite` | Invite user to group |
| POST | `/v1/groups/:id/invite/accept` | Accept group invite |
| POST | `/v1/groups/:id/invite/deny` | Deny group invite |
| POST | `/v1/groups/:id/kick` | Kick member (admin+) |
| POST | `/v1/groups/:id/ban` | Ban user from group |
| POST | `/v1/groups/:id/unban` | Unban user |
| GET | `/v1/groups/:id/members` | List members with roles |
| PUT | `/v1/groups/:id/role` | Change member role |

### Circle (Governed Group)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/circle` | Get user's circle (if any) |
| POST | `/v1/circle/invite` | Propose invite (starts vote) |
| POST | `/v1/circle/invite/accept` | Accept invite |
| POST | `/v1/circle/invite/deny` | Deny invite |
| POST | `/v1/circle/kick` | Propose kick (starts vote) |
| POST | `/v1/circle/ban` | Propose ban (starts vote) |
| POST | `/v1/circle/unban` | Propose unban (starts vote) |
| GET | `/v1/circle/votes` | List active votes |
| POST | `/v1/circle/votes/:id/cast` | Cast vote (approve/reject) |

### Policies

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/policies` | List all own policies |
| PUT | `/v1/policies/global` | Update global defaults |
| PUT | `/v1/policies/friend/:id` | Set friend-specific policy |
| PUT | `/v1/policies/group/:id` | Set group-specific policy |
| PUT | `/v1/policies/group/:id/override` | Override to exclude from "most permissive" |
| GET | `/v1/policies/effective/:viewerId` | Compute effective policy for viewer |

### Location & Nearby

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/location/lease` | Start or extend sharing lease |
| POST | `/v1/location/publish` | Push location update |
| GET | `/v1/location/self` | Get own current location state |
| GET | `/v1/nearby` | Get nearby friends/group-mates within VPR |
| GET | `/v1/nearby/overlay` | Get coarse H3 overlay with density |
| POST | `/v1/nearby/cell` | Get members in a specific H3 cell |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/notifs/prefs` | Get notification preferences |
| PUT | `/v1/notifs/prefs` | Update notification preferences |
| POST | `/v1/notifs/snooze` | Snooze notifications for user/time |
| GET | `/v1/encounters` | List recent encounter events |
| POST | `/v1/notifs/test` | Send test push notification |

### Places (API)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/places` | List own places |
| POST | `/v1/places` | Create place |
| PUT | `/v1/places/:id` | Update place |
| DELETE | `/v1/places/:id` | Delete place |
| PUT | `/v1/places/:id/exceptions` | Set per-user/group exceptions |
| PUT | `/v1/places/:id/share-label` | Toggle label sharing |

### Calendars

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/cal/connect/:provider` | Start calendar OAuth |
| POST | `/v1/cal/disconnect/:provider` | Disconnect calendar |
| GET | `/v1/cal/calendars` | List connected calendars |
| PUT | `/v1/cal/selected` | Select which calendars affect busy status |
| PUT | `/v1/cal/busy/custom` | Create/update custom busy windows |

### Entitlements & Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/entitlements` | Get current entitlements |
| POST | `/v1/billing/checkout` | Create Stripe checkout session |
| POST | `/v1/billing/webhook` | Stripe webhook handler |
| POST | `/v1/grants/student` | Apply for student grant |
| POST | `/v1/grants/low-income` | Apply for low-income grant |
| POST | `/v1/lifetime/gift` | Gift lifetime membership |

### Debug & Export

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/debug/export` | Request full data export (DSAR) |
| GET | `/v1/debug/export/:id` | Download export when ready |

### Blog (Public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/blog` | List published posts |
| GET | `/blog/:slug` | Get post content |
| GET | `/blog/:slug/meta` | Get post metadata only |

### Blog Admin

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/blog` | Create published post |
| PUT | `/admin/blog/:slug` | Update published post |
| DELETE | `/admin/blog/:slug` | Delete post |
| POST | `/admin/blog/draft` | Upload draft |
| PUT | `/admin/blog/draft/:id` | Update draft |
| DELETE | `/admin/blog/draft/:id` | Delete draft |
| GET | `/admin/blog/drafts` | List drafts |
| GET | `/admin/blog/draft/:id/preview` | Preview rendered draft |
| POST | `/admin/blog/draft/:id/publish` | Publish draft |

---

## Authentication & Security

### Token Strategy

| Token | Format | Lifetime | Storage |
|-------|--------|----------|---------|
| Access | JWS (signed JWT) | 15 minutes | Memory only |
| Refresh | JWE (encrypted JWT) | 30 days | HttpOnly cookie + D1 hash |

**Refresh rotation**: Each refresh issues a new token and invalidates the old one. Reuse of old token revokes entire session (potential theft).

### OAuth Providers

- Apple Sign In
- Google Sign In
- GitHub (optional for developer auth)
- Email + OTP fallback
- Phone + SMS OTP fallback

### Security Measures

| Measure | Implementation |
|---------|----------------|
| Rate limiting | Per-IP and per-account limits via KV counters |
| Input validation | All inputs validated with Zod schemas |
| Anti-enumeration | Generic responses for friend requests, invites |
| CAPTCHA | Required after repeated gifting attempts |
| Idempotency | Mutation endpoints accept idempotency keys |
| Audit logging | Role changes and admin actions logged to queue |
| HTTPS only | Enforced at Cloudflare edge |

### Abuse Prevention

- **Rate limits**: Tiered by endpoint sensitivity
- **Cooldowns**: 15m re-entry gate prevents notification spam
- **Snooze**: Per-user notification suppression
- **Blocks**: Blocked users cannot see your location or request friendship
- **Bans**: Banned users cannot rejoin group until unbanned

---

## Features

### Map & Nearby

- **Precise pins** for users within your VPR
- **Coarse overlay** (H3 resolution 6) for users outside VPR, off by default
- **Compass view** with gyro-based direction and distance-scaled dots
- **Nearby list** with distance, last update time, and quick actions

### Notifications (Product)

- **Enter-only** — Fires once when someone enters PER
- **15-minute gate** — Prevents repeat notifications for same pair
- **Separate toggles** — Friends vs group-mates
- **Snooze** — Mute specific person for 1h/4h/24h/forever

### Places (User Feature)

- **Geofencing** — Circular zones with custom radius
- **Behaviors**: suppress (default), coarse, ghost
- **Exceptions** — Override behavior per friend or group
- **Labels** — Optionally share "At Home", "At Work", etc.

### Calendars (Busy Status)

- **Providers**: EventKit (iOS), iCloud, Google Calendar, Microsoft Outlook
- **Busy merge**: OR across all selected calendars
- **Custom windows**: Manual recurring busy times (e.g., "Gym M/W/F 6-7pm")

### Groups & Circle

- **Groups**: Casual friend groups with owner/admin/mod/member roles
- **Circle**: Family-style group with majority voting for all governance
- **Voting**: Kick, ban, and invite actions require 50%+ approval in Circle

---

## User Interface

### Design Language

**Theme**: Foresty/bee/hive aesthetic — natural, warm, trustworthy

| Token | Value | Usage |
|-------|-------|-------|
| Honey | `#F4C542` | Primary accent, CTAs |
| Forest | `#1F4D3B` | Primary text, headers |
| Hive | `#6B4E3D` | Secondary accent, icons |
| Pollen | `#FFF3C4` | Backgrounds, highlights |
| Midnight | `#0B1F17` | Dark mode background |
| Cream | `#FFFDF5` | Light mode background |

### Component Library

Built on **shadcn/ui** with Radix primitives:

- Button, Input, Select, Switch, Slider
- Sheet (bottom drawer), Dialog, Popover
- Tabs, Accordion, Card
- Avatar, Badge, Toast

Animation via **Framer Motion** and **Magic UI** for:

- Page transitions
- List item entrances
- Map pin animations
- Pull-to-refresh

### Key Screens

| Screen | Description |
|--------|-------------|
| Home (Map) | MapLibre view with nearby pins, overlay toggle, compass button |
| Nearby List | Scrollable list sorted by distance, tap for detail sheet |
| Detail Sheet | User info, snooze, policy quick-edit, directions link |
| Friends | List with pending requests, search, add |
| Groups | List of groups with member counts, create/manage |
| Places | List of saved places, create/edit with map picker |
| Settings | Profile, policies, calendars, notifications, billing |

### Accessibility

- **High contrast mode** for visibility
- **Large tap targets** (minimum 44×44pt)
- **Screen reader labels** on all interactive elements
- **Reduced motion** option respects system preference

---

## Pricing & Entitlements

### Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 4 places, 1 group, standard VPR/PER |
| Plus | $1.99/mo or $10/yr | Unlimited places, groups, custom VPR/PER, priority support |
| Group Plan | $6/mo or $20/yr | 5 Plus seats, shared billing, Circle feature |
| Lifetime | $25 (intro $22) | Permanent Plus access |

### Grants

| Grant | Duration | Eligibility |
|-------|----------|-------------|
| Student | 12 months (renewable) | Valid .edu email or student ID verification |
| Low-income | 6 months (renewable) | Self-declared, no verification |

### Loyalty Program

After 90 consecutive days of any Plus subscription, users unlock **Loyalty Lifetime** at $18 (vs $25).

### Gift Lifetime

Users can gift Lifetime memberships to friends via `/v1/lifetime/gift`. CAPTCHA required after 3 gifts per 24h window.

---

## Roadmap

### v0.1 — MVP (Current)

- [x] Monorepo scaffold
- [ ] Authentication: OTP (email + SMS), single identifier, link email + phone to one user
- [ ] User & device management
- [ ] Friendships & blocks (friends-only social graph)
- [ ] Location leases & nearby (friends-only)
- [ ] Staging + production deployment

### v0.2 — Notifications

- [ ] Notifications with enter-only logic

### v0.3 — Groups

- [ ] Groups with roles
- [ ] Memberships, invites, bans
- [ ] Group policies + effective policy evaluation
- [ ] Circle governance (voting) (optional within v0.3)

### v1.0 — Public Release (Definition of Done)

A **v1.0** release means the product is stable, secure, deployable, and usable end-to-end by real users.

Core product (functional):

- [ ] Auth is production-ready (OTP email + SMS)
  - [ ] OTP throttling/cooldowns/attempt limits enforced
  - [ ] Sessions + refresh rotation implemented
  - [ ] Account linking supported (email + phone on one user)
- [ ] Users + devices production-ready
  - [ ] Device registration + push token updates
  - [ ] Device/session revocation and logout
- [ ] Friends system production-ready
  - [ ] Request/accept/deny/remove/block/unblock
  - [ ] Anti-enumeration responses for sensitive flows
- [ ] Location system production-ready
  - [ ] Lease start/extend/stop
  - [ ] Publish endpoint with validation + sanity checks
  - [ ] Nearby works for friends and respects policies
- [ ] Policies production-ready
  - [ ] Global + friend policies stored and enforced
  - [ ] Effective policy calculation documented and tested

Quality & safety (non-functional):

- [ ] Observability baseline
  - [ ] Structured logs (request id, user id when available)
  - [ ] `/healthz` and `/readyz` are reliable
- [ ] Security baseline
  - [ ] Rate limiting for auth + high-risk endpoints
  - [ ] Input validation (Zod) on all endpoints
  - [ ] Secrets managed for local/staging/prod
- [ ] Data layer baseline
  - [ ] D1 schema finalized for v1.0 tables
  - [ ] Migration workflow validated on staging and production
  - [ ] Backfill/recovery plan for accidental deploy issues (documented)

Release readiness:

- [ ] CI checks are green (typecheck/lint/tests)
- [ ] Mobile builds can point to staging and production
- [ ] Docs updated (SPEC + CHANGELOG + MAINTAINING)

### v1.1 — Places

- [ ] Places & exceptions

### v1.2 — Communities

- [ ] Larger groups (50+ members)
- [ ] Group heatmaps
- [ ] Group chat (DO-backed real-time)

### v2.0 — Analytics & Growth

- [ ] Encounter history & insights
- [ ] Activity trends
- [ ] Referral program
- [ ] A/B testing framework

---

## Legal & Compliance

- **GDPR-aligned** consent flows for EU users
- **Separate analytics consent** (optional, not bundled with core consent)
- **DSAR export** via `/v1/debug/export` within 30 days
- **Soft delete** with 30-day retention before permanent purge
- **Minimum data** — No location history stored beyond last-known (24h TTL)

---

## Observability

- **Cloudflare Analytics** enabled by default
- **Structured logging** to Cloudflare Logpush or R2
- **Admin logs** queryable via `/admin/logs`
- **Metrics** endpoint for Prometheus scraping
- **Error tracking** via queue-based error aggregation

---

Last updated: 2026-01-22
