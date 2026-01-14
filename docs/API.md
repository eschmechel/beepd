# API

> REST API endpoints, request/response examples, and error codes.

## Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:8787` |
| Preview | `https://api-preview.beepd.tech` |
| Production | `https://api.beepd.app` |

## Authentication

All endpoints except `/auth/*` require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new device | None |
| POST | `/auth/login` | Re-authenticate with deviceSecret | None |

### User Settings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/me/settings` | Get current user settings | Required |
| PUT | `/me/settings` | Update sharing mode, radius, display name | Required |

### Location

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| PUT | `/me/location` | Update current location | Required |
| GET | `/nearby` | Get nearby users | Required |

### Friends

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/friends` | List all friends + my friend code | Required |
| POST | `/friends/invite/accept` | Accept friend invite by code | Required |
| DELETE | `/friends/{friendId}` | Remove a friend | Required |
| POST | `/friends/{friendId}/block` | Block a user | Required |

### GDPR / Privacy

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/me/export-data` | Export all user data (JSON) | Required |
| DELETE | `/me/account` | Delete account and all data | Required |
| GET | `/me/consent-history` | Get consent grant history | Required |
| POST | `/me/consent` | Update consent grants | Required |

### Blog (Public)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/blog/posts` | List published posts | None |
| GET | `/blog/posts/:slug` | Get single post | None |
| POST | `/blog/posts` | Create post | Admin |
| PUT | `/blog/posts/:slug` | Update post | Admin |
| DELETE | `/blog/posts/:slug` | Delete post | Admin |

---

## Request/Response Examples

### Register

**Request:**
```http
POST /auth/register
Content-Type: application/json

{}
```

**Response:**
```json
{
  "userId": 42,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "friendCode": "ABC123XY",
  "deviceSecret": "dGhpcyBpcyBhIHNlY3JldA=="
}
```

> **Important:** Store `deviceSecret` securely. It's needed to re-authenticate.

### Login

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "deviceSecret": "dGhpcyBpcyBhIHNlY3JldA=="
}
```

**Response:**
```json
{
  "userId": 42,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Settings

**Request:**
```http
GET /me/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "userId": 42,
  "mode": "FRIENDS_ONLY",
  "radiusMeters": 500,
  "displayName": "Alice",
  "friendCode": "ABC123XY",
  "showFriendsOnMap": false
}
```

### Update Settings

**Request:**
```http
PUT /me/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "mode": "EVERYONE",
  "radiusMeters": 1000,
  "displayName": "Alice W."
}
```

**Response:**
```json
{
  "success": true
}
```

### Update Location

**Request:**
```http
PUT /me/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 10.5
}
```

**Response:**
```json
{
  "success": true
}
```

### Get Nearby Users

**Request:**
```http
GET /nearby?scope=friends
Authorization: Bearer <token>
```

**Response:**
```json
{
  "nearby": [
    {
      "userId": 3,
      "displayName": "Bob",
      "distanceCategory": "within 500m",
      "lastUpdated": "2026-01-10T12:34:56Z",
      "isFriend": true
    }
  ],
  "newAlerts": [3]
}
```

**Query Parameters:**

| Param | Values | Description |
|-------|--------|-------------|
| `scope` | `friends`, `everyone` | Filter nearby users |

**Distance Categories:**

| Category | Range |
|----------|-------|
| `within 100m` | 0 - 100m |
| `within 500m` | 100m - 500m |
| `within 1km` | 500m - 1km |
| `beyond 1km` | > 1km |

### List Friends

**Request:**
```http
GET /friends
Authorization: Bearer <token>
```

**Response:**
```json
{
  "friends": [
    {
      "userId": 3,
      "displayName": "Bob",
      "friendCode": "XYZ789AB",
      "createdAt": "2026-01-02T00:00:00Z"
    }
  ],
  "myFriendCode": "ABC123XY"
}
```

### Accept Friend Invite

**Request:**
```http
POST /friends/invite/accept
Authorization: Bearer <token>
Content-Type: application/json

{
  "friendCode": "XYZ789AB"
}
```

**Response:**
```json
{
  "success": true,
  "friend": {
    "userId": 3,
    "displayName": "Bob"
  }
}
```

### Export User Data (GDPR)

**Request:**
```http
GET /me/export-data
Authorization: Bearer <token>
```

**Response:**
```json
{
  "exportDate": "2026-01-10T12:00:00Z",
  "user": {
    "id": 42,
    "displayName": "Alice",
    "friendCode": "ABC123XY",
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "settings": {
    "mode": "FRIENDS_ONLY",
    "radiusMeters": 500,
    "showFriendsOnMap": false
  },
  "consentHistory": [
    {
      "purpose": "LOCATION",
      "granted": true,
      "grantedAt": "2026-01-01T00:00:00Z",
      "version": "1.0"
    }
  ],
  "friends": [
    {
      "userId": 3,
      "displayName": "Bob",
      "createdAt": "2026-01-02T00:00:00Z"
    }
  ]
}
```

### Delete Account (GDPR)

**Request:**
```http
DELETE /me/account
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Account and all associated data have been deleted"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Missing/invalid JWT |
| `FORBIDDEN` | 403 | Consent required |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

**Error Response Format:**

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid latitude: must be between -90 and 90"
  }
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `PUT /me/location` | 1 request per 10 seconds |
| `GET /nearby` | 10 requests per minute |
| `POST /auth/*` | 5 requests per minute |
| All other endpoints | 60 requests per minute |

---

## TypeScript Types

```typescript
// types/api.ts

export type SharingMode = 'OFF' | 'FRIENDS_ONLY' | 'EVERYONE';

export interface UserSettings {
  userId: number;
  mode: SharingMode;
  radiusMeters: number;
  displayName: string | null;
  friendCode: string;
  showFriendsOnMap: boolean;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  isSimulated?: boolean;
}

export interface NearbyUser {
  userId: number;
  displayName: string | null;
  distanceCategory: 'within 100m' | 'within 500m' | 'within 1km';
  lastUpdated: string;
  isFriend?: boolean;
}

export interface NearbyResponse {
  nearby: NearbyUser[];
  newAlerts: number[];
}

export interface Friend {
  userId: number;
  displayName: string | null;
  friendCode: string;
  createdAt: string;
}

export interface FriendsResponse {
  friends: Friend[];
  myFriendCode: string;
}

export type ConsentPurpose = 'LOCATION' | 'CALENDAR' | 'ANALYTICS';

export interface ConsentGrant {
  purpose: ConsentPurpose;
  granted: boolean;
  version: string;
  grantedAt: string;
  withdrawnAt?: string;
}

export interface ExportData {
  exportDate: string;
  user: {
    id: number;
    displayName: string | null;
    friendCode: string;
    createdAt: string;
  };
  settings: UserSettings;
  consentHistory: ConsentGrant[];
  friends: Friend[];
}
```

See also:
- [Database Schema](DATABASE.md)
- [Security & Auth](SECURITY.md)
