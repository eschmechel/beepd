<!-- markdownlint-disable MD022 MD032 -->

# Beepd — Initialization Roadmap (TODO)

This file is an execution checklist for getting Beepd from scaffold → working MVP.

Guiding docs:

- Source of truth: [docs/SPEC.md](docs/SPEC.md)
- Release notes: [docs/CHANGELOG.md](docs/CHANGELOG.md)

Working style (per your preference):

- You write most of the implementation.
- I can help by: creating files, defining Zod schemas/types, and scaffolding endpoint files.
- If I scaffold endpoints: I will only write function declarations + the step-by-step process inside (no real logic).

---

## Phase 0 — Confirm the “golden path” (1–2 hours)

- [x] MVP scope for v0.1
  - [x] Authentication: passwordless OTP (email + SMS), single identifier field, one user can link both email and phone
    - [x] OTP code: 6 digits
    - [x] OTP expiry: 5 minutes
    - [x] OTP verify attempts: 5 attempts per challenge, then require a new challenge
    - [x] OTP resend/start cooldown: 30 seconds
    - [x] Identifier detection:
      - [x] Contains `@` → email
      - [x] Otherwise → phone
    - [x] Normalization:
      - [x] Email: trim + lowercase
      - [x] Phone: trim + parse + store as E.164 (require leading `+`, do not guess region)
    - [x] Login is allowed with either verified identifier
  - [x] Social graph: friends-only (groups deferred)
  - [x] Location MVP: lease + publish + nearby list (no Places)
  - [x] Notifications: deferred (enter-only notifications come later)
- [x] Environments
  - [x] Local dev: wrangler + local D1
  - [x] Remote: staging + production
- [x] IDs: UUID v4 everywhere

### MVP Definition (v0.1)

MVP includes a passwordless OTP sign-in flow (email + SMS via a single identifier field) that creates sessions and supports linking both email and phone to one user. It supports a friends-only social graph, plus location sharing via leases and location publishing, with a nearby list for eligible friends. The MVP supports local development via Wrangler + local D1 and includes staging + production environments.

MVP excludes groups, Places (privacy zones), and enter-only notifications (these are deferred to later versions).

---

## Phase 1 — Project hygiene + dev loop (0.5–1 day)

- [x] Ensure dev commands work:
  - [x] `pnpm install`
  - [x] `pnpm typecheck`
  - [x] `pnpm dev:api` (wrangler)
  - [x] `pnpm dev:web` (vite)
  - [x] `pnpm dev:site` (astro)
  - [x] `pnpm dev:mobile` (expo)
- [x] Add consistent env template files (no secrets committed):
  - [x] [apps/api/.env.example](apps/api/.env.example)
  - [x] [apps/web/.env.example](apps/web/.env.example)
  - [x] [apps/site/.env.example](apps/site/.env.example)
  - [x] [apps/mobile/.env.example](apps/mobile/.env.example) (or docs for EAS secrets)
- [x] Wire “typed env” pattern for each app:
  - [x] API: parse env with Zod once at startup
  - [x] Web/Site: typed config wrapper
  - [x] Mobile: typed config wrapper

Optional:

- [x] Add `lint` configs per package (eslint) instead of placeholders.
- [x] Add formatting checks to CI.

---

## Phase 2 — Data layer (D1 + Drizzle) (1–2 days)

Goal: D1 schema + Drizzle access layer working locally.

- [x] Add Drizzle to API:
  - [x] Dependencies in [apps/api/package.json](apps/api/package.json)
  - [x] Drizzle config + migrations folder
- [x] Implement initial tables from [docs/SPEC.md](docs/SPEC.md) “Data Model”:
  - [x] `users`
  - [x] `user_identities` (email/phone linked to user)
  - [x] `devices` (include `is_primary` column)
  - [x] `sessions` (v0.1: one session per device)
  - [x] `otp_challenges` (store only `code_hash`, never plaintext)
  - [x] `relationships`
  - [x] `policies`
- [x] Create a “db client” module in API:
  - [x] `getDb(env)` (returns drizzle instance)
  - [x] `schema` exports
- [x] Add local migration workflow:
  - [x] generate migration
  - [x] apply migration locally

Acceptance checks:

- [x] Can run migrations locally
- [x] Can query D1 from one API route

---

## Phase 3 — API foundation (Hono + validation + errors) (1–2 days)

Goal: consistent request validation, auth middleware, error shape.

- [x] Create API conventions:
  - [x] Choose response shape (envelope vs raw JSON)
  - [x] Standard error response (`code`, `message`, `details?`)
  - [x] Request-id / trace-id in logs
- [x] Add Zod request validation helper:
  - [x] `zValidator(schema)` middleware OR per-route parse (per-route parse chosen)
- [x] Add structured logging helper:
  - [x] `log.info({ ... })` style

Endpoints to scaffold early:

- [x] `GET /healthz`
- [x] `GET /readyz` (D1 connectivity check)

---

## Phase 4 — Auth (sessions) (2–4 days)

Auth approach: **OTP + OAuth** with account linking support.

### Authentication Methods

| Method      | Provider  | Cost         | Status              |
| ----------- | --------- | ------------ | ------------------- |
| OTP (Email) | Resend    | Free (3k/mo) | 🔄 In progress      |
| OTP (Phone) | Twilio    | ~$0.008/SMS  | ⏳ Stubbed (v1.1)   |
| OAuth       | Google    | Free         | 🔄 In progress      |
| OAuth       | GitHub    | Free         | 🔄 In progress      |
| OAuth       | Microsoft | Free         | ⏳ v1.2 (Azure)     |
| OAuth       | Apple     | $120/yr      | ⏳ v1.2 (Apple Dev) |

### OTP Specifications

| Setting         | Value                               |
| --------------- | ----------------------------------- |
| Code format     | 6 digits, alphanumeric (no I,O,1,0) |
| Code lifetime   | 5 minutes                           |
| Max attempts    | 5 per challenge                     |
| Resend cooldown | 60 seconds                          |

### Rate Limiting (KV-based)

| Limit Type           | Threshold  | Window        |
| -------------------- | ---------- | ------------- |
| Per identifier (OTP) | 5 requests | 1 hour        |
| Per IP (all auth)    | 4 requests | 1 minute      |
| Verify attempts      | 5 max      | per challenge |
| Resend cooldown      | 60 seconds | N/A           |

### Token Strategy

- **Access token**: iron-session JWS, 15 minutes, memory only
- **Refresh token**: iron-session JWE, 30 days, HttpOnly cookie + D1 hash
- **Refresh rotation**: Every use issues new token, invalidates old one

### Account Linking

Users can link multiple identifiers to a single account:

- Email + phone via OTP
- OAuth providers linked via identity matching

**Linking flow:** While logged in, start linking → verify new identifier → auto-linked to existing user (no separate verification needed).

### Display Name

- Optional in signup
- If not provided, defaults to email prefix (e.g., "john" for "john@example.com")

### Token Strategy

| Token   | Format              | Lifetime   | Storage                   |
| ------- | ------------------- | ---------- | ------------------------- |
| Access  | JWS (signed JWT)    | 15 minutes | Memory only               |
| Refresh | JWE (encrypted JWT) | 30 days    | HttpOnly cookie + D1 hash |

### Core Flows

**OTP Flow:**

1. `POST /v1/auth/start` - normalize identifier → rate check → create challenge → send OTP
2. `POST /v1/auth/verify` - validate OTP → find/create user → issue tokens

**OAuth Flow:**

1. `POST /v1/auth/start` with `provider` - returns OAuth redirect URL
2. User authenticates with provider
3. `POST /v1/auth/verify` with `code` - exchanges code → find/create user → issue tokens

**Linking Flow (while logged in):**

1. `POST /v1/auth/link/start` - send verification to new identifier
2. `POST /v1/auth/link/verify` - verify code → link to existing user

### Implementation Checklist

- [x] KV rate limiter helper (`src/lib/rate-limit.ts`)
- [x] DB query helpers (`src/db/queries/auth.ts`)
- [X] **OTP service (`src/services/otp.ts`)**
  - [x] Configuration constants (hardcoded in file header)
    - CODE_LENGTH = 6
    - CODE_CHARS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    - CODE_LIFETIME_MS = 5 _ 60 _ 1000 (5 minutes)
    - RESEND_COOLDOWN_MS = 60 \* 1000 (60 seconds)
    - MAX_ATTEMPTS = 5
  - [X] `generateCode()` - crypto.getRandomValues()
  - [X] `hashCode()` / `verifyCodeHash()` - bcrypt
  - [X] `sendEmailCode()` - Resend integration
  - [X] `startChallenge()` - rate check → create challenge → send
  - [X] `verifyCode()` - check attempts → validate → consume
- [ ] **OAuth service (`src/services/oauth.ts`)**
  - [ ] `getProviderConfig()` - URLs and scopes for Google + GitHub
  - [ ] `generateState()` - cryptographically random string
  - [ ] `exchangeCode()` - token exchange for each provider
  - [ ] `fetchUserInfo()` - user profile from each provider
  - [ ] `startOAuth()` - create state → return auth URL
  - [ ] `handleCallback()` - validate state → exchange → get user info
  - [ ] Microsoft OAuth (deferred to v1.2)
  - [ ] Apple OAuth (deferred to v1.2)
- [ ] **Auth service (`src/services/auth.ts`)**
  - [ ] Token creation/verification with iron-session
  - [ ] Session management (create, rotate, revoke)
  - [ ] User/identity lookup and creation
  - [ ] Orchestrate OTP/OAuth flows
- [ ] Endpoint implementation:
  - [ ] `POST /v1/auth/start` (OTP + OAuth)
  - [ ] `POST /v1/auth/verify` (OTP + OAuth)
  - [ ] `POST /v1/auth/link/start`
  - [ ] `POST /v1/auth/link/verify`
  - [ ] `POST /v1/auth/refresh`
  - [ ] `POST /v1/auth/logout`
  - [ ] `GET /v1/auth/me`

### Acceptance Checks

- [ ] Can create user via OTP
- [ ] Can create user via OAuth
- [ ] Can link second identifier to existing user
- [ ] Can refresh session
- [ ] Can revoke session
- [ ] Rate limits enforced

---

## Phase 5 — Users + devices (1–2 days)

- [ ] `PUT /v1/users/me` (profile update)
- [ ] `GET /v1/users/:id` (public profile)
- [ ] Devices:
  - [ ] `GET /v1/devices`
  - [ ] `PUT /v1/devices/push-token`
  - [ ] `PUT /v1/devices/:id/primary`

Notes:

- v0.1 devices table includes `is_primary`.
- v0.1 auth keeps one active session per device (refresh rotation updates that row).

Acceptance checks:

- [ ] Can register device and update push token

---

## Phase 6 — Friends (3–6 days)

Friends-only for v0.1.

Friends:

- [ ] `POST /v1/friends/request`
- [ ] `POST /v1/friends/accept`
- [ ] `POST /v1/friends/deny`
- [ ] `POST /v1/friends/remove`
- [ ] `POST /v1/friends/block`
- [ ] `POST /v1/friends/unblock`
- [ ] `GET /v1/friends`
- [ ] `GET /v1/friends/requests`

Acceptance checks:

- [ ] Can friend another user

---

## Phase 7 — Location MVP (lease + publish + nearby) (4–8 days)

Goal: “See who is nearby” with opt-in lease.

- [ ] Durable Objects:
  - [ ] Implement `UserStateDO` (lease state + last-known location)
  - [ ] Implement `PairStateDO` (re-entry gate + cooldown)
- [ ] API endpoints:
  - [ ] `POST /v1/location/lease`
  - [ ] `POST /v1/location/publish`
  - [ ] `GET /v1/nearby`

Acceptance checks:

- [ ] Lease can be started and expires
- [ ] Publish stores last-known
- [ ] Nearby returns eligible users (friends)

---

## Phase 8 — Notifications (enter-only)

Deferred to v0.2 (see “Later versions” below).

---

## Phase 10 — Web app MVP screens (parallel track)

Goal: minimal UI for login + map-ish list.

- [ ] Auth screens
- [ ] Friends list
- [ ] Nearby list (start here before full map)

---

## Phase 11 — Mobile app MVP (parallel track)

Goal: background-safe location publish loop (careful with permissions).

- [ ] Auth flow
- [ ] Permissions + location acquisition
- [ ] Lease start/stop controls
- [ ] Periodic publish
- [ ] Nearby list

---

## Phase 12 — Observability + ops (ongoing)

- [ ] Add structured logs for core flows
- [ ] `/metrics` (if/when needed)
- [ ] Admin log query endpoint (later)
- [ ] Rate limiting strategy (KV)

---

## Suggested first 3 tasks (good learning path)

- [ ] (1) D1 + Drizzle working locally in API (Phase 2)
- [ ] (2) Auth endpoints with Zod schemas + middleware (Phase 4)
- [ ] (3) Friends request/accept + list (Phase 6)

---

## Notes / parking lot

- Deprecated subdependency warnings from Expo/RN tooling are expected; avoid overriding them unless upstream changes.
- If TS complains about missing inputs for Astro again, ensure `src/env.d.ts` exists.

---

## Later versions (move down as needed)

These are intentionally deferred so v0.1 stays focused.

### v0.2 — Groups

- [ ] MVP scope for v0.2:
  - [ ] Groups + memberships + invites
- [ ] DB tables: `groups`, `memberships`, `invites`, `bans`
- [ ] API endpoints:
  - [ ] `POST /v1/groups`
  - [ ] `GET /v1/groups`
  - [ ] `GET /v1/groups/:id`
  - [ ] `POST /v1/groups/:id/invite`
  - [ ] `POST /v1/groups/:id/invite/accept`
  - [ ] `GET /v1/groups/:id/members`
- [ ] Policy precedence integration (group policies vs global)

### v0.2 — Notifications

- [ ] Choose push provider approach:
  - [ ] Expo push for MVP
  - [ ] APNS/FCM direct later
- [ ] API endpoints:
  - [ ] `POST /v1/notifs/test`
  - [ ] `GET /v1/notifs/prefs`
  - [ ] `PUT /v1/notifs/prefs`
- [ ] Gate notifications via `PairStateDO`:
  - [ ] 15m cooldown
  - [ ] snooze support (later)

Acceptance checks:

- [ ] “Entered proximity” triggers exactly once per cooldown window

### v0.3 — Groups

- [ ] MVP scope for v0.3:
  - [ ] Groups + memberships + invites
- [ ] DB tables: `groups`, `memberships`, `invites`, `bans`
- [ ] API endpoints:
  - [ ] `POST /v1/groups`
  - [ ] `GET /v1/groups`
  - [ ] `GET /v1/groups/:id`
  - [ ] `POST /v1/groups/:id/invite`
  - [ ] `POST /v1/groups/:id/invite/accept`
  - [ ] `GET /v1/groups/:id/members`
- [ ] Policy precedence integration (group policies vs global)

### v1.1 — Places

- [ ] DB schema:
  - [ ] `places`
  - [ ] `place_exceptions`
- [ ] API endpoints:
  - [ ] CRUD places
  - [ ] exceptions
- [ ] Integrate into nearby/visibility rules:
  - [ ] suppress/coarse/ghost behavior

### v1.2 — Communities

- [ ] Larger groups (50+ members)
- [ ] Group heatmaps
- [ ] Group chat (DO-backed real-time)

### v2.0 — Analytics & Growth

- [ ] Encounter history & insights
- [ ] Activity trends
- [ ] Referral program
- [ ] A/B testing framework
