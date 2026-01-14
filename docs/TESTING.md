# Testing Strategy

This document covers the testing approach, tools, and examples for Beepd.

## Testing Philosophy

```
         ┌─────────────┐
         │   E2E (5%)  │  Playwright (web), Detox (mobile)
         ├─────────────┤
         │Integration  │  API contract tests, Component tests
         │   (15%)     │  
         ├─────────────┤
         │  Unit Tests │  Vitest for logic, utilities
         │   (80%)     │  
         └─────────────┘
```

- **Unit Tests (80%)**: Fast, isolated tests for business logic
- **Integration Tests (15%)**: API contracts, component interactions
- **E2E Tests (5%)**: Critical user journeys only

---

## Tools

| Tool | Purpose | Location |
|------|---------|----------|
| **Vitest** | Unit & integration tests | All packages |
| **Playwright** | E2E tests (web) | `apps/web/e2e/` |
| **Testing Library** | Component testing | `packages/ui/` |
| **Miniflare** | Worker testing environment | `apps/backend/` |
| **Detox** | E2E tests (mobile) | `apps/mobile/e2e/` |

---

## Configuration

### Vitest Workspace

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'backend',
      root: './apps/backend',
      environment: 'miniflare',
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'packages',
      root: './packages',
      environment: 'jsdom',
    },
  },
]);
```

### Base Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/__tests__/**',
      ],
    },
  },
});
```

---

## Running Tests

### All Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run in watch mode
pnpm test -- --watch
```

### Specific Packages

```bash
# Backend tests only
pnpm --filter backend test

# UI package tests only
pnpm --filter @beepd/ui test

# Shared package tests only
pnpm --filter @beepd/shared test
```

### E2E Tests

```bash
# Web E2E (Playwright)
pnpm --filter web test:e2e

# Web E2E with UI
pnpm --filter web test:e2e -- --ui

# Mobile E2E (Detox) - requires simulator
pnpm --filter mobile test:e2e
```

---

## Unit Tests

### Utility Functions

```typescript
// packages/shared/src/__tests__/geolocation.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDistance, categorizeDistance } from '../geolocation';

describe('geolocation', () => {
  describe('calculateDistance', () => {
    it('calculates distance between two points correctly', () => {
      const sanFrancisco = { lat: 37.7749, lng: -122.4194 };
      const nearby = { lat: 37.7849, lng: -122.4094 };
      
      const distance = calculateDistance(sanFrancisco, nearby);
      
      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(1500);
    });
    
    it('returns 0 for same location', () => {
      const location = { lat: 37.7749, lng: -122.4194 };
      expect(calculateDistance(location, location)).toBe(0);
    });
  });
  
  describe('categorizeDistance', () => {
    it.each([
      [50, 'within 100m'],
      [250, 'within 500m'],
      [750, 'within 1km'],
      [1500, 'beyond 1km'],
    ])('categorizes %d meters as "%s"', (meters, expected) => {
      expect(categorizeDistance(meters)).toBe(expected);
    });
  });
});
```

### Validation Functions

```typescript
// packages/shared/src/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateCoordinates, validateFriendCode } from '../validation';

describe('validation', () => {
  describe('validateCoordinates', () => {
    it('accepts valid coordinates', () => {
      expect(validateCoordinates(37.7749, -122.4194)).toBe(true);
      expect(validateCoordinates(0, 0)).toBe(true);
      expect(validateCoordinates(-90, 180)).toBe(true);
    });
    
    it('rejects invalid latitude', () => {
      expect(validateCoordinates(91, 0)).toBe(false);
      expect(validateCoordinates(-91, 0)).toBe(false);
    });
    
    it('rejects invalid longitude', () => {
      expect(validateCoordinates(0, 181)).toBe(false);
      expect(validateCoordinates(0, -181)).toBe(false);
    });
  });
  
  describe('validateFriendCode', () => {
    it('accepts valid 8-character codes', () => {
      expect(validateFriendCode('ABC123XY')).toBe(true);
      expect(validateFriendCode('12345678')).toBe(true);
    });
    
    it('rejects invalid codes', () => {
      expect(validateFriendCode('ABC')).toBe(false); // Too short
      expect(validateFriendCode('ABC123XYZ')).toBe(false); // Too long
      expect(validateFriendCode('')).toBe(false); // Empty
    });
  });
});
```

---

## API Contract Tests

### Worker Testing with Miniflare

```typescript
// apps/backend/src/__tests__/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('API Contract', () => {
  let worker: UnstableDevWorker;
  let token: string;
  
  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
    
    // Register a test user
    const registerRes = await worker.fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const { token: t } = await registerRes.json();
    token = t;
  });
  
  afterAll(async () => {
    await worker.stop();
  });
  
  describe('GET /me/settings', () => {
    it('returns user settings', async () => {
      const res = await worker.fetch('/me/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body).toMatchObject({
        userId: expect.any(Number),
        mode: expect.stringMatching(/^(OFF|FRIENDS_ONLY|EVERYONE)$/),
        radiusMeters: expect.any(Number),
      });
    });
    
    it('returns 401 without auth', async () => {
      const res = await worker.fetch('/me/settings');
      expect(res.status).toBe(401);
    });
  });
  
  describe('PUT /me/location', () => {
    it('accepts valid location', async () => {
      const res = await worker.fetch('/me/location', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: 37.7749,
          longitude: -122.4194,
        }),
      });
      
      expect(res.status).toBe(200);
    });
    
    it('rejects invalid coordinates', async () => {
      const res = await worker.fetch('/me/location', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: 999, // Invalid
          longitude: -122.4194,
        }),
      });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('GET /nearby', () => {
    it('returns empty list when no friends nearby', async () => {
      const res = await worker.fetch('/nearby', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body).toMatchObject({
        nearby: expect.any(Array),
        newAlerts: expect.any(Array),
      });
    });
  });
});
```

### Auth Flow Tests

```typescript
// apps/backend/src/__tests__/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Authentication', () => {
  let worker: UnstableDevWorker;
  
  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });
  
  afterAll(async () => {
    await worker.stop();
  });
  
  describe('POST /auth/register', () => {
    it('creates a new user and returns credentials', async () => {
      const res = await worker.fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body).toMatchObject({
        userId: expect.any(Number),
        token: expect.any(String),
        friendCode: expect.stringMatching(/^[A-Z0-9]{8}$/),
        deviceSecret: expect.any(String),
      });
    });
  });
  
  describe('POST /auth/login', () => {
    it('authenticates with valid deviceSecret', async () => {
      // First register
      const registerRes = await worker.fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const { deviceSecret } = await registerRes.json();
      
      // Then login
      const loginRes = await worker.fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceSecret }),
      });
      
      expect(loginRes.status).toBe(200);
      
      const body = await loginRes.json();
      expect(body).toHaveProperty('token');
    });
    
    it('rejects invalid deviceSecret', async () => {
      const res = await worker.fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceSecret: 'invalid-secret' }),
      });
      
      expect(res.status).toBe(401);
    });
  });
});
```

---

## Component Tests

### React Component Testing

```typescript
// packages/ui/src/__tests__/SharingToggle.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SharingToggle } from '../components/SharingToggle';

describe('SharingToggle', () => {
  it('renders all mode options', () => {
    render(
      <SharingToggle mode="OFF" onModeChange={() => {}} />
    );
    
    expect(screen.getByText('OFF')).toBeInTheDocument();
    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.getByText('Everyone')).toBeInTheDocument();
  });
  
  it('highlights the current mode', () => {
    render(
      <SharingToggle mode="FRIENDS_ONLY" onModeChange={() => {}} />
    );
    
    const friendsButton = screen.getByText('Friends');
    expect(friendsButton).toHaveAttribute('data-state', 'on');
  });
  
  it('calls onModeChange when mode is selected', () => {
    const onModeChange = vi.fn();
    render(
      <SharingToggle mode="OFF" onModeChange={onModeChange} />
    );
    
    fireEvent.click(screen.getByText('Friends'));
    
    expect(onModeChange).toHaveBeenCalledWith('FRIENDS_ONLY');
  });
  
  it('does not call onModeChange when current mode is clicked', () => {
    const onModeChange = vi.fn();
    render(
      <SharingToggle mode="OFF" onModeChange={onModeChange} />
    );
    
    fireEvent.click(screen.getByText('OFF'));
    
    expect(onModeChange).not.toHaveBeenCalled();
  });
});
```

### NearbyList Component

```typescript
// packages/ui/src/__tests__/NearbyList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NearbyList } from '../components/NearbyList';

const mockNearbyUsers = [
  { userId: 1, displayName: 'Alice', distanceCategory: 'within 100m', lastUpdated: new Date().toISOString() },
  { userId: 2, displayName: 'Bob', distanceCategory: 'within 500m', lastUpdated: new Date().toISOString() },
];

describe('NearbyList', () => {
  it('renders list of nearby users', () => {
    render(<NearbyList nearby={mockNearbyUsers} />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
  
  it('shows distance categories', () => {
    render(<NearbyList nearby={mockNearbyUsers} />);
    
    expect(screen.getByText('within 100m')).toBeInTheDocument();
    expect(screen.getByText('within 500m')).toBeInTheDocument();
  });
  
  it('shows empty state when no users nearby', () => {
    render(<NearbyList nearby={[]} />);
    
    expect(screen.getByText('No friends nearby')).toBeInTheDocument();
  });
  
  it('highlights new alerts', () => {
    render(<NearbyList nearby={mockNearbyUsers} newAlerts={[1]} />);
    
    const aliceCard = screen.getByText('Alice').closest('[data-testid="nearby-card"]');
    expect(aliceCard).toHaveAttribute('data-new-alert', 'true');
  });
});
```

---

## E2E Tests (Playwright)

### Setup

```typescript
// apps/web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Demo Page Tests

```typescript
// apps/web/e2e/demo.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Interactive Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
  });
  
  test('allows setting location on map', async ({ page }) => {
    // Click on map to set location
    const map = page.locator('.leaflet-container');
    await map.click({ position: { x: 200, y: 200 } });
    
    // Location should be set
    await expect(page.locator('[data-testid="user-location"]')).toBeVisible();
  });
  
  test('shows nearby friends when sharing is enabled', async ({ page }) => {
    // Set location first
    const map = page.locator('.leaflet-container');
    await map.click({ position: { x: 200, y: 200 } });
    
    // Enable sharing
    await page.click('button:has-text("Friends")');
    
    // Should show nearby list
    await expect(page.locator('[data-testid="nearby-list"]')).toBeVisible();
  });
  
  test('displays privacy notice before enabling location', async ({ page }) => {
    // Click to enable location sharing
    await page.click('button:has-text("Friends")');
    
    // Privacy notice should appear
    await expect(page.locator('[data-testid="privacy-notice"]')).toBeVisible();
  });
});
```

### Landing Page Tests

```typescript
// apps/web/e2e/landing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('renders hero section', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('h1')).toContainText('Beepd');
    await expect(page.locator('[data-testid="hero-cta"]')).toBeVisible();
  });
  
  test('navigates to demo from CTA', async ({ page }) => {
    await page.goto('/');
    
    await page.click('[data-testid="hero-cta"]');
    
    await expect(page).toHaveURL('/demo');
  });
  
  test('has working navigation', async ({ page }) => {
    await page.goto('/');
    
    await page.click('nav a:has-text("Features")');
    await expect(page).toHaveURL('/features');
    
    await page.click('nav a:has-text("Pricing")');
    await expect(page).toHaveURL('/pricing');
  });
});
```

---

## Integration Tests

### Proximity Detection Flow

```typescript
// apps/backend/src/__tests__/proximity.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Proximity Detection', () => {
  let worker: UnstableDevWorker;
  let user1Token: string;
  let user2Token: string;
  let user2FriendCode: string;
  
  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
    
    // Register two users
    const res1 = await worker.fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data1 = await res1.json();
    user1Token = data1.token;
    
    const res2 = await worker.fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data2 = await res2.json();
    user2Token = data2.token;
    user2FriendCode = data2.friendCode;
  });
  
  afterAll(async () => {
    await worker.stop();
  });
  
  it('detects friends entering proximity', async () => {
    // 1. Add as friends
    await worker.fetch('/friends/invite/accept', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friendCode: user2FriendCode }),
    });
    
    // 2. Enable sharing for both users
    await worker.fetch('/me/settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'FRIENDS_ONLY' }),
    });
    
    await worker.fetch('/me/settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${user2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'FRIENDS_ONLY' }),
    });
    
    // 3. Set locations close to each other
    await worker.fetch('/me/location', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude: 37.7749, longitude: -122.4194 }),
    });
    
    await worker.fetch('/me/location', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${user2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude: 37.7750, longitude: -122.4195 }), // ~100m away
    });
    
    // 4. Check nearby for user1
    const nearbyRes = await worker.fetch('/nearby', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    
    const nearby = await nearbyRes.json();
    
    expect(nearby.nearby).toHaveLength(1);
    expect(nearby.newAlerts).toHaveLength(1);
  });
});
```

---

## Test Data Factories

### User Factory

```typescript
// apps/backend/src/__tests__/factories/user.ts
import { faker } from '@faker-js/faker';

export function createMockUser(overrides = {}) {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    displayName: faker.person.firstName(),
    friendCode: faker.string.alphanumeric(8).toUpperCase(),
    mode: 'OFF' as const,
    radiusMeters: 500,
    createdAt: faker.date.past(),
    ...overrides,
  };
}

export function createMockLocation(userId: number, overrides = {}) {
  return {
    userId,
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    accuracy: faker.number.int({ min: 5, max: 100 }),
    isSimulated: false,
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

export function createMockNearbyUser(overrides = {}) {
  return {
    userId: faker.number.int({ min: 1, max: 10000 }),
    displayName: faker.person.firstName(),
    distanceCategory: 'within 500m' as const,
    lastUpdated: faker.date.recent().toISOString(),
    isFriend: true,
    ...overrides,
  };
}
```

---

## Coverage Requirements

### Minimum Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### Generating Coverage Reports

```bash
# Generate coverage report
pnpm test -- --coverage

# View HTML report
open coverage/index.html
```

---

## CI Integration

### GitHub Actions Test Job

```yaml
# .github/workflows/ci.yml
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
    - run: pnpm test -- --coverage
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
```

---

## Best Practices

### Do

- Write tests before fixing bugs (TDD for bug fixes)
- Use descriptive test names that explain the behavior
- Keep tests isolated and independent
- Use factories for test data
- Test edge cases and error scenarios

### Don't

- Don't test implementation details
- Don't rely on test execution order
- Don't skip tests without a reason
- Don't test third-party libraries
- Don't write flaky tests (retry logic in tests is a smell)

---

## Next Steps

- Read [SETUP.md](./SETUP.md) for development setup
- Read [API.md](./API.md) for API documentation
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for CI/CD details
