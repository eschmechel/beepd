# Database

> Schema, ERD, queries, and data retention policies for Beepd.

## Overview

Beepd uses **Cloudflare D1** (serverless SQLite) with **Drizzle ORM** for type-safe queries.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIP DIAGRAM                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │      users       │
                              ├──────────────────┤
                              │ PK id            │
                              │    device_secret_│
                              │      hash        │
                              │    friend_code   │
                              │    display_name  │
                              │    mode          │
                              │    radius_meters │
                              │    created_at    │
                              │    updated_at    │
                              └────────┬─────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          │ 1:1                        │ 1:N                        │ N:N (self)
          ▼                            ▼                            ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│    locations     │        │  consent_grants  │        │   friendships    │
├──────────────────┤        ├──────────────────┤        ├──────────────────┤
│ PK/FK user_id    │        │ PK id            │        │ PK id            │
│     latitude     │        │ FK user_id       │        │ FK user_id       │
│     longitude    │        │    purpose       │        │ FK friend_id     │
│     accuracy     │        │    granted       │        │    status        │
│     is_simulated │        │    version       │        │    created_at    │
│     updated_at   │        │    granted_at    │        └──────────────────┘
│     expires_at   │        │    withdrawn_at  │
└──────────────────┘        └──────────────────┘
      (24h TTL)                  (audit log)              N:N (self)
                                                              │
          ┌───────────────────────────────────────────────────┤
          │                                                   │
          ▼                                                   ▼
┌──────────────────┐                              ┌──────────────────┐
│  blocked_users   │                              │ proximity_events │
├──────────────────┤                              ├──────────────────┤
│ PK id            │                              │ PK id            │
│ FK blocker_id    │                              │ FK user_id       │
│ FK blocked_id    │                              │ FK nearby_user_id│
│    created_at    │                              │    state (IN/OUT)│
└──────────────────┘                              │    last_checked  │
   (one-way block)                                │    expires_at    │
                                                  └──────────────────┘
                                                       (5min TTL)


┌──────────────────┐
│      posts       │  (Blog - separate concern, no user FK)
├──────────────────┤
│ PK id            │
│    slug          │
│    title         │
│    content       │
│    status        │
│    published_at  │
└──────────────────┘
```

## Schema (Drizzle)

### Users Table

```typescript
// backend/db/schema.ts
import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceSecretHash: text('device_secret_hash').notNull().unique(),
  friendCode: text('friend_code', { length: 8 }).notNull().unique(),
  displayName: text('display_name', { length: 50 }),
  mode: text('mode', { enum: ['OFF', 'FRIENDS_ONLY', 'EVERYONE'] })
    .notNull()
    .default('OFF'),
  radiusMeters: integer('radius_meters').notNull().default(500),
  showFriendsOnMap: integer('show_friends_on_map', { mode: 'boolean' })
    .notNull()
    .default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  check('mode_check', sql`${table.mode} IN ('OFF', 'FRIENDS_ONLY', 'EVERYONE')`),
  check('radius_check', sql`${table.radiusMeters} BETWEEN 100 AND 5000`),
  check('friend_code_len', sql`LENGTH(${table.friendCode}) = 8`),
]);
```

### Locations Table

```typescript
export const locations = sqliteTable('locations', {
  userId: integer('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  accuracy: real('accuracy'),
  isSimulated: integer('is_simulated', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  check('lat_check', sql`${table.latitude} BETWEEN -90 AND 90`),
  check('lon_check', sql`${table.longitude} BETWEEN -180 AND 180`),
  index('expires_at_idx').on(table.expiresAt),
]);
```

### Friendships Table

```typescript
export const friendships = sqliteTable('friendships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  friendId: integer('friend_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['PENDING', 'ACCEPTED'] })
    .notNull()
    .default('ACCEPTED'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  uniqueIndex('user_friend_unique').on(table.userId, table.friendId),
  index('user_id_idx').on(table.userId),
  index('friend_id_idx').on(table.friendId),
  check('no_self_friend', sql`${table.userId} != ${table.friendId}`),
]);
```

### Blocked Users Table

```typescript
export const blockedUsers = sqliteTable('blocked_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blockerId: integer('blocker_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  blockedId: integer('blocked_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  uniqueIndex('blocker_blocked_unique').on(table.blockerId, table.blockedId),
  index('blocker_idx').on(table.blockerId),
  index('blocked_idx').on(table.blockedId),
  check('no_self_block', sql`${table.blockerId} != ${table.blockedId}`),
]);
```

### Proximity Events Table

```typescript
export const proximityEvents = sqliteTable('proximity_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  nearbyUserId: integer('nearby_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  state: text('state', { enum: ['IN', 'OUT'] }).notNull(),
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  uniqueIndex('pair_unique').on(table.userId, table.nearbyUserId),
  index('proximity_expires_at_idx').on(table.expiresAt),
  check('no_self_proximity', sql`${table.userId} != ${table.nearbyUserId}`),
]);
```

### Consent Grants Table

```typescript
export const consentGrants = sqliteTable('consent_grants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose', { enum: ['LOCATION', 'CALENDAR', 'ANALYTICS'] })
    .notNull(),
  granted: integer('granted', { mode: 'boolean' }).notNull(),
  version: text('version').notNull(), // Privacy policy version
  grantedAt: integer('granted_at', { mode: 'timestamp_ms' }).notNull(),
  withdrawnAt: integer('withdrawn_at', { mode: 'timestamp_ms' }),
  ipAddress: text('ip_address'), // For audit trail
  userAgent: text('user_agent'), // For audit trail
}, (table) => [
  index('consent_user_idx').on(table.userId),
  index('consent_purpose_idx').on(table.purpose),
]);
```

### Blog Posts Table

```typescript
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(), // Stored as Markdown
  status: text('status', { enum: ['DRAFT', 'PUBLISHED'] }).notNull().default('DRAFT'),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  index('posts_slug_idx').on(table.slug),
  index('posts_status_idx').on(table.status),
]);
```

## Relationship Details

### users ↔ locations (1:1)

```
┌────────┐  1      1  ┌───────────┐
│ users  │───────────│ locations │
└────────┘            └───────────┘
```

- Each user has **at most one** location record (current position only)
- Location is **replaced** (not appended) on each update - no history stored
- 24-hour TTL via `expires_at` field, cleaned by cron job
- `CASCADE DELETE`: when user is deleted, location is automatically deleted

### users ↔ friendships (N:N self-referential)

```
┌────────┐            ┌─────────────┐
│ users  │◄──user_id──│ friendships │
│        │◄─friend_id─│             │
└────────┘            └─────────────┘
```

- User A friends User B creates **one row**: `(user_id=A, friend_id=B)`
- Friendship is **mutual** - queries check both directions
- `UNIQUE(user_id, friend_id)` prevents duplicate friendships
- `CHECK(user_id != friend_id)` prevents self-friending

### users ↔ blocked_users (N:N self-referential, one-way)

```
┌────────┐              ┌───────────────┐
│ users  │◄──blocker_id─│ blocked_users │
│        │◄──blocked_id─│               │
└────────┘              └───────────────┘
```

- User A blocks User B creates **one row**: `(blocker_id=A, blocked_id=B)`
- Blocking is **one-way**: A blocks B ≠ B blocks A
- Proximity queries check **both directions** (neither can see the other)

### users ↔ proximity_events (N:N self-referential, ephemeral)

```
┌────────┐                 ┌──────────────────┐
│ users  │◄──user_id───────│ proximity_events │
│        │◄─nearby_user_id─│                  │
└────────┘                 └──────────────────┘
```

- Tracks state transitions: "User A **entered/left** proximity of User B"
- `state`: `IN` (entered radius) or `OUT` (left radius)
- **5-minute TTL** - very short-lived, cleaned frequently
- Used to determine `newAlerts` in `/nearby` response

### users ↔ consent_grants (1:N)

```
┌────────┐  1      N  ┌────────────────┐
│ users  │───────────│ consent_grants │
└────────┘            └────────────────┘
```

- User can have **multiple consent records** (one per purpose)
- **Historical audit log** - records are not deleted, `withdrawn_at` is set instead
- Required for GDPR compliance

## Data Retention

| Table | Retention | Enforcement |
|-------|-----------|-------------|
| users | Permanent | N/A |
| locations | 24 hours | TTL via `expires_at` + Cron |
| friendships | Permanent | N/A |
| blocked_users | Permanent | N/A |
| proximity_events | 5 minutes | TTL via `expires_at` + Cron |
| consent_grants | 2 years | Retention policy |

## Common Queries

### Find Nearby Users (Friends-only Mode)

```sql
SELECT 
  u.id, u.display_name, 
  l.latitude, l.longitude, l.updated_at
FROM locations l
JOIN users u ON u.id = l.user_id
JOIN friendships f ON f.friend_id = l.user_id
WHERE 
  f.user_id = ? -- Current user
  AND u.mode IN ('FRIENDS_ONLY', 'EVERYONE')
  AND l.expires_at > ? -- Current timestamp
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users b
    WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
       OR (b.blocker_id = u.id AND b.blocked_id = ?)
  );
```

### Get All Friends

```sql
SELECT u.* FROM users u
JOIN friendships f ON f.friend_id = u.id
WHERE f.user_id = ?
UNION
SELECT u.* FROM users u
JOIN friendships f ON f.user_id = u.id
WHERE f.friend_id = ?;
```

### Cleanup Expired Data

```sql
-- Run via Cron Trigger every hour
DELETE FROM locations WHERE expires_at < ?;
DELETE FROM proximity_events WHERE expires_at < ?;
```

## Data Flow Diagrams

### Find Nearby Friends

```
    GET /nearby
         │
         ▼
┌─────────────────┐
│ 1. Get my user  │
│    & settings   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 2. Get my       │────▶│ locations table │
│    location     │     │ WHERE user_id=me│
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 3. Get friends' │────▶│ friendships     │
│    user IDs     │     │ WHERE user_id=me│
└────────┬────────┘     │ OR friend_id=me │
         │              └─────────────────┘
         ▼
┌─────────────────┐
│ 4. Calculate    │  haversine(my_loc, friend_loc)
│    distances    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Filter by    │  distance <= radius_meters
│    radius       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 6. Exclude      │────▶│ blocked_users   │
│    blocked      │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ 7. Return       │  { nearby: [...], newAlerts: [...] }
│    response     │
└─────────────────┘
```

### Location Update

```
    PUT /me/location
    { latitude, longitude }
         │
         ▼
┌─────────────────┐
│ 1. Validate JWT │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Check mode   │──▶ mode = 'OFF' ──▶ Return 400
│    != OFF       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Check        │──▶ No consent ──▶ Return 403
│    consent      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Upsert       │  expires_at = now + 24h
│    location     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Return 200   │
└─────────────────┘
```

See also:
- [API Design](API.md)
- [Security & GDPR](SECURITY.md)
