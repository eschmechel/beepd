# Security & GDPR

> Authentication, privacy protections, and GDPR compliance.

## Authentication

### Flow Overview

```
1. User registers → Generate deviceSecret (crypto.randomUUID)
2. Hash deviceSecret (SHA-256) → Store hash in DB
3. Return deviceSecret to user (store in localStorage/AsyncStorage)
4. User requests JWT → POST /auth/login with deviceSecret
5. Verify hash → Issue JWT (7-day expiry)
6. All API calls include JWT in Authorization header
7. Worker validates JWT signature + expiry
```

### JWT Structure

```typescript
interface JWTPayload {
  sub: number; // userId
  iat: number; // issued at
  exp: number; // expiry (7 days)
  // No PII in JWT
}
```

### Why Device Secret (not Email/Password)

| Factor | Decision | Reason |
|--------|----------|--------|
| Privacy | DeviceSecret | No PII required |
| Friction | DeviceSecret | Instant registration |
| GDPR | DeviceSecret | Minimizes data collection |
| Demo mode | DeviceSecret | Works without phone |

## Security Measures

### Transport & Infrastructure

| Measure | Implementation |
|---------|----------------|
| HTTPS | Enforced by Cloudflare |
| Rate limiting | Per-endpoint limits (see below) |
| CORS | Restrict to known origins |

### Input Validation

| Measure | Implementation |
|---------|----------------|
| Schema validation | Zod schemas on all inputs |
| SQL injection | Drizzle ORM with parameterized queries |
| XSS prevention | React's automatic escaping + DOMPurify |

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| `PUT /me/location` | 1 request per 10 seconds |
| `GET /nearby` | 10 requests per minute |
| `POST /auth/*` | 5 requests per minute |
| All other endpoints | 60 requests per minute |

## Privacy Security

| Measure | Implementation |
|---------|----------------|
| Location TTL | 24 hours automatic expiry |
| No location history | Only last location stored |
| Proximity event TTL | 5 minutes |
| Mutual opt-in | Both users must enable EVERYONE |
| Friend code protection | Never returned by /nearby |
| Consent audit trail | Stored in consent_grants table |

---

## GDPR Compliance

### Consent Management

```typescript
interface ConsentState {
  LOCATION: boolean;
  CALENDAR: boolean;
  ANALYTICS: boolean;
  version: string;
  acceptedAt: number | null;
}
```

**Flow:**
1. App loads → Check for existing consent
2. If no consent → Show consent banner
3. User reviews privacy info → Accepts or Declines
4. If Accept → Record consent in local storage + backend
5. If Decline → Show "features limited" message

### Data Subject Rights

#### Right to Access (Article 15)

```http
GET /me/export-data
Authorization: Bearer <token>
```

Returns all user data in JSON format.

#### Right to Erasure (Article 17)

```http
DELETE /me/account
Authorization: Bearer <token>
```

Deletes user and all associated data (CASCADE deletes handle related tables).

#### Right to Data Portability (Article 20)

```http
GET /me/export-data
Authorization: Bearer <token>
```

Machine-readable JSON format.

### Privacy Policy Versioning

```typescript
const PRIVACY_POLICY_VERSION = '1.0';

interface ConsentGrant {
  userId: number;
  purpose: 'LOCATION' | 'CALENDAR' | 'ANALYTICS';
  granted: boolean;
  version: string;  // Privacy policy version at time of consent
  grantedAt: number;
  withdrawnAt?: number;
}
```

When privacy policy changes:
1. Increment version
2. Check if user's consent version matches current
3. If outdated, re-prompt for consent
4. Record new version on acceptance

### Data Retention

| Data | Retention | Reason |
|------|-----------|--------|
| Location | 24 hours | Minimum necessary for proximity |
| Proximity events | 5 minutes | Alert deduplication only |
| Consent records | 2 years | GDPR audit requirements |
| User account | Until deletion | User request |

### Data Protection Impact Assessment (DPIA)

**Status**: Required (Article 35)

**High-Level Summary**:
- **Processing**: Location data for proximity detection
- **Purpose**: Enable friends to discover when nearby
- **Risks**: Unwanted tracking, location exposure
- **Mitigations**: 24h TTL, mutual opt-in, alert suppression

---

## Security Headers

```
# apps/web/public/_headers
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://api.beepd.app; frame-ancestors 'none'; object-src 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
```

## HTML Sanitization

Always sanitize user-generated content before rendering:

```typescript
import DOMPurify from 'isomorphic-dompurify';

const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'hr', 'strong', 'em',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img',
    'code', 'pre', 'blockquote',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],
};

// Sanitize on input (when saving)
const sanitized = DOMPurify.sanitize(userInput, DOMPURIFY_CONFIG);

// Sanitize on output (defense in depth)
const safeHtml = DOMPurify.sanitize(storedContent, DOMPURIFY_CONFIG);
```

## Security Checklist

- [ ] HTTPS enforced
- [ ] JWT tokens expire (7 days)
- [ ] Rate limiting on all endpoints
- [ ] Input validation with Zod
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] XSS prevention (React + DOMPurify)
- [ ] CORS configured
- [ ] CSP headers set
- [ ] Location data TTL (24h)
- [ ] No location history stored
- [ ] Consent tracking
- [ ] Data export endpoint
- [ ] Account deletion endpoint
- [ ] Privacy policy versioning

---

## Public Repository Security

This repository is intentionally public for portfolio visibility and free GitHub Actions runners. Follow these guidelines to keep secrets secure.

### What's Safe to Commit

| Category | Examples | Why Safe |
|----------|----------|----------|
| Source code | All `.ts`, `.tsx`, `.astro` files | Contains no secrets |
| Schema definitions | Drizzle schema, Zod validators | Structure isn't secret |
| CI/CD configs | `.github/workflows/*.yml` | Uses secret references, not values |
| Documentation | All markdown files | Public information |
| Config files | `wrangler.toml`, `astro.config.mjs` | Uses environment variables |
| Package files | `package.json`, `pnpm-lock.yaml` | Dependency info is public |

### What Must NEVER Be Committed

| Category | Examples | Risk |
|----------|----------|------|
| Environment files | `.env`, `.env.local`, `.env.production` | Contains all secrets |
| API keys | Cloudflare tokens, RevenueCat keys | Full account access |
| JWT secrets | `JWT_SECRET` | Can forge auth tokens |
| Service account keys | `google-service-account.json` | Play Store access |
| Database exports | `.sql` dumps with user data | Privacy violation |

### Required .gitignore Entries

```gitignore
# Environment files - NEVER commit these
.env
.env.*
!.env.example

# Service account keys
*.pem
*-service-account.json
google-service-account.json

# Local database files
*.sqlite
*.db

# Wrangler state (may contain sensitive data)
.wrangler/

# IDE settings (may contain paths)
.idea/
.vscode/settings.json

# OS files
.DS_Store
Thumbs.db

# Build artifacts
node_modules/
dist/
.astro/
```

### GitHub Secrets Configuration

Store these in **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `CLOUDFLARE_API_TOKEN` | Workers/Pages deploy token | Cloudflare Dashboard > API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Your account identifier | Cloudflare Dashboard > Overview |
| `JWT_SECRET` | Token signing secret | Generate: `openssl rand -base64 32` |
| `EXPO_TOKEN` | EAS Build access | expo.dev > Account Settings > Access Tokens |
| `REVENUECAT_API_KEY` | Subscription management | RevenueCat Dashboard > API Keys |

### Cloudflare-Specific Considerations

#### wrangler.toml - What's Safe

```toml
# SAFE to commit - these are not secrets
name = "beepd-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "beepd"
database_id = "abc123..."  # This ID is NOT secret - it's just an identifier
```

The `database_id` is **not secret** - it's just a UUID identifier. Without an API token, knowing this ID is useless.

#### Worker Secrets - Set via CLI

```bash
# Set secrets that should NOT be in wrangler.toml
wrangler secret put JWT_SECRET
wrangler secret put REVENUECAT_API_KEY

# For preview environment
wrangler secret put JWT_SECRET --env preview
```

### Environment Variable Patterns

#### .env.example (Safe to Commit)

```bash
# .env.example - Template with placeholder values
# Copy to .env and fill in real values

# API URLs (not secret)
PUBLIC_API_URL=http://localhost:8787
PUBLIC_APP_URL=http://localhost:4321

# Auth (MUST be set in .env or GitHub Secrets)
JWT_SECRET=generate-with-openssl-rand-base64-32

# Cloudflare (set in GitHub Secrets for CI)
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id-here

# Mobile (set in GitHub Secrets for CI)
EXPO_TOKEN=your-expo-token-here

# Subscriptions (set in .env and GitHub Secrets)
REVENUECAT_API_KEY=your-revenuecat-key-here
```

### Pre-Commit Checklist

Before every commit, verify:

- [ ] No `.env` files staged (`git status`)
- [ ] No API keys in code (search for `sk_`, `pk_`, `api_key`)
- [ ] No hardcoded secrets in `wrangler.toml`
- [ ] Service account JSON files not staged

### If You Accidentally Commit Secrets

1. **Immediately rotate the compromised credential**
2. Remove from history (requires force push):
   ```bash
   # Remove file from entire history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (coordinate with team)
   git push origin --force --all
   ```
3. Consider the secret permanently compromised - always rotate

### GitHub Security Features

Enable these in **Settings > Code security and analysis**:

- **Dependabot alerts**: Notifies of vulnerable dependencies
- **Dependabot security updates**: Auto-creates PRs for fixes
- **Secret scanning**: Alerts if secrets are pushed (GitHub detects common patterns)
- **Push protection**: Blocks pushes containing detected secrets

See also:
- [API Documentation](API.md)
- [Database Schema](DATABASE.md)
