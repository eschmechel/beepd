# Monetization Guide

This guide covers subscription handling, ad integration, and pricing strategies for Beepd.

## Overview

For a privacy-first app, we recommend:
- **Primary**: Freemium subscriptions (RevenueCat for mobile, Stripe for web)
- **Secondary**: Privacy-respecting ads with premium removal
- **Avoid**: Selling location data, invasive ad tracking

---

## Payment Provider Comparison

| Provider | Best For | App Store Support | Cloudflare Workers | Fees |
|----------|----------|-------------------|-------------------|------|
| **RevenueCat** | Mobile IAP | Native iOS/Android | Webhook sync | 1% (paid plans) |
| **Stripe** | Web payments | Custom sync required | Native support | 2.9% + 30c |
| **Paddle** | MoR (handles tax) | No | Webhook support | 5% + 50c |
| **LemonSqueezy** | Simple setup | No | Webhook support | 5% + 50c |

### Recommended Setup

- **Mobile (iOS/Android)**: RevenueCat (handles App Store/Play Store complexity)
- **Web**: Stripe (for marketing site upgrades)
- **Backend**: Unified subscription table synced from both

---

## Database Schema

Add to `apps/backend/db/schema.ts`:

```typescript
export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // Stripe fields (web purchases)
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  
  // RevenueCat fields (mobile purchases)
  revenuecatAppUserId: text('revenuecat_app_user_id'),
  productId: text('product_id'),
  store: text('store', { enum: ['APP_STORE', 'PLAY_STORE', 'STRIPE'] }),
  
  // Common fields
  status: text('status', { 
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'] 
  }).notNull().default('active'),
  plan: text('plan', { enum: ['free', 'premium', 'family'] }).notNull().default('free'),
  
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp_ms' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp_ms' }),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false),
  
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  index('subscriptions_stripe_customer_idx').on(table.stripeCustomerId),
  index('subscriptions_status_idx').on(table.status),
]);
```

---

## Stripe Integration (Web)

### Webhook Handler

```typescript
// apps/backend/src/routes/webhooks/stripe.ts
import { Hono } from 'hono';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { subscriptions } from '../../db/schema';

const stripe = new Hono<{ Bindings: Env }>();

stripe.post('/stripe', async (c) => {
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.json({ error: 'Missing signature' }, 400);

  const rawBody = await c.req.text();
  let event: Stripe.Event;
  
  try {
    const stripeClient = new Stripe(c.env.STRIPE_SECRET_KEY);
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      sig,
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  const db = c.get('db');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      
      if (userId) {
        await db.insert(subscriptions).values({
          userId: parseInt(userId),
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          status: 'active',
          plan: session.metadata?.plan || 'premium',
          store: 'STRIPE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            status: 'active',
            updatedAt: new Date(),
          }
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await db.update(subscriptions)
        .set({
          status: subscription.status as any,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await db.update(subscriptions)
        .set({ status: 'canceled', updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
      break;
    }
  }

  return c.json({ received: true });
});

export default stripe;
```

### Checkout Session Creation

```typescript
// apps/backend/src/routes/billing.ts
import { Hono } from 'hono';
import Stripe from 'stripe';

const billing = new Hono<{ Bindings: Env }>();

billing.post('/checkout', async (c) => {
  const user = c.get('user');
  const { plan } = await c.req.json<{ plan: 'monthly' | 'yearly' }>();

  const stripeClient = new Stripe(c.env.STRIPE_SECRET_KEY);

  const prices = {
    monthly: c.env.STRIPE_PRICE_MONTHLY,
    yearly: c.env.STRIPE_PRICE_YEARLY,
  };

  const session = await stripeClient.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: prices[plan], quantity: 1 }],
    success_url: `${c.env.WEB_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${c.env.WEB_URL}/billing/canceled`,
    metadata: { user_id: String(user.id), plan },
    subscription_data: {
      trial_period_days: 7,
      metadata: { user_id: String(user.id) }
    },
    allow_promotion_codes: true,
  });

  return c.json({ url: session.url });
});

export default billing;
```

---

## RevenueCat Integration (Mobile)

### Installation

```bash
npx expo install react-native-purchases
```

### Provider Setup

```typescript
// apps/mobile/providers/RevenueCatProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';

interface RevenueCatContextType {
  isReady: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isPremium: boolean;
  purchasePackage: (packageId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

const ENTITLEMENT_ID = 'premium';

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);

  const isPremium = customerInfo?.entitlements.active[ENTITLEMENT_ID] !== undefined;

  useEffect(() => {
    const init = async () => {
      const apiKey = Platform.OS === 'ios' 
        ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY!
        : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY!;
      
      await Purchases.configure({ apiKey, appUserID: null });

      Purchases.addCustomerInfoUpdateListener(setCustomerInfo);

      const [info, offers] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);

      setCustomerInfo(info);
      setOfferings(offers);
      setIsReady(true);
    };

    init();
  }, []);

  const purchasePackage = async (packageId: string): Promise<boolean> => {
    try {
      const pkg = offerings?.current?.availablePackages.find(
        (p) => p.identifier === packageId
      );
      if (!pkg) return false;

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(customerInfo);
      return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (error: any) {
      if (error.userCancelled) return false;
      throw error;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    const info = await Purchases.restorePurchases();
    setCustomerInfo(info);
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  };

  return (
    <RevenueCatContext.Provider value={{
      isReady, customerInfo, offerings, isPremium, purchasePackage, restorePurchases
    }}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export const useRevenueCat = () => {
  const context = useContext(RevenueCatContext);
  if (!context) throw new Error('useRevenueCat must be used within RevenueCatProvider');
  return context;
};
```

### RevenueCat Webhook Handler

```typescript
// apps/backend/src/routes/webhooks/revenuecat.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { subscriptions } from '../../db/schema';

const revenuecat = new Hono<{ Bindings: Env }>();

revenuecat.post('/revenuecat', async (c) => {
  const signature = c.req.header('X-RevenueCat-Signature');
  const body = await c.req.text();

  // Verify signature (implementation depends on your setup)
  
  const payload = JSON.parse(body);
  const { event } = payload;
  const db = c.get('db');
  const userId = parseInt(event.app_user_id);

  if (isNaN(userId)) return c.json({ received: true });

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL': {
      await db.insert(subscriptions).values({
        userId,
        revenuecatAppUserId: event.app_user_id,
        productId: event.product_id,
        status: 'active',
        store: event.store,
        currentPeriodStart: new Date(event.purchased_at_ms),
        currentPeriodEnd: new Date(event.expiration_at_ms),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: subscriptions.userId,
        set: { status: 'active', updatedAt: new Date() }
      });
      break;
    }

    case 'CANCELLATION':
    case 'EXPIRATION': {
      await db.update(subscriptions)
        .set({ status: 'canceled', updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId));
      break;
    }
  }

  return c.json({ received: true });
});

export default revenuecat;
```

---

## Feature Gating

### Premium Middleware

```typescript
// apps/backend/src/middleware/premium.ts
import { createMiddleware } from 'hono/factory';
import { eq, and, gt } from 'drizzle-orm';
import { subscriptions } from '../db/schema';

export const requirePremium = createMiddleware(async (c, next) => {
  const user = c.get('user');
  const db = c.get('db');

  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, 'active'),
      gt(subscriptions.currentPeriodEnd, new Date())
    ),
  });

  if (!subscription) {
    return c.json({ 
      error: 'Premium required',
      code: 'PREMIUM_REQUIRED',
    }, 403);
  }

  await next();
});

export const checkPremium = createMiddleware(async (c, next) => {
  const user = c.get('user');
  const db = c.get('db');

  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, 'active'),
      gt(subscriptions.currentPeriodEnd, new Date())
    ),
  });

  c.set('isPremium', !!subscription);
  await next();
});
```

### Mobile Feature Gate Hook

```typescript
// apps/mobile/hooks/useFeatureGate.ts
import { useRevenueCat } from '../providers/RevenueCatProvider';

interface FeatureLimits {
  maxFriends: number;
  maxRadiusMeters: number;
  canUsePlaceAlerts: boolean;
  canUseCalendarIntegration: boolean;
  showsAds: boolean;
}

export function useFeatureGate(): FeatureLimits {
  const { isPremium } = useRevenueCat();

  if (isPremium) {
    return {
      maxFriends: Infinity,
      maxRadiusMeters: 50000,
      canUsePlaceAlerts: true,
      canUseCalendarIntegration: true,
      showsAds: false,
    };
  }

  return {
    maxFriends: 3,
    maxRadiusMeters: 1000,
    canUsePlaceAlerts: false,
    canUseCalendarIntegration: false,
    showsAds: true,
  };
}
```

---

## Freemium Tier Design

### Recommended Feature Split

| Feature | Free | Premium |
|---------|------|---------|
| Proximity alerts | 3 friends | Unlimited |
| Detection radius | 100m - 1km | 100m - 50km |
| Location history | None | None (privacy!) |
| Custom notifications | No | Yes |
| Place-based alerts | No | Yes |
| Calendar integration | No | Yes |
| Map themes | Light/Dark | 6 themes |
| Friend groups | No | Yes |
| Ads | Shows ads | No ads |

### Why This Works

1. **Core feature free** - Basic proximity works without payment
2. **Premium = convenience** - Extended range, not essential features
3. **Privacy preserved** - No location history even for premium
4. **No "unlock friends"** - Feels exploitative, avoid this pattern

---

## Pricing Strategy

### Market Comparison

| App | Monthly | Annual |
|-----|---------|--------|
| Life360 | $7.99 | $69.99 |
| Telegram Premium | $4.99 | $35.88 |
| Discord Nitro | $9.99 | $99.99 |

### Recommended Pricing

| Tier | Monthly | Annual | Notes |
|------|---------|--------|-------|
| **Premium** | $4.99 | $29.99 | 50% annual savings |
| **Family** | $7.99 | $59.99 | Up to 6 members |

**Rationale**:
- Lower than Life360 (position as privacy alternative)
- 50% annual discount encourages commitment
- Family plan captures household use case
- Accessible for young adults (primary demographic)

---

## Ad Integration (Privacy-Friendly)

### Option A: Google AdMob with Consent

```typescript
// apps/mobile/components/AdBanner.tsx
import { useRevenueCat } from '../providers/RevenueCatProvider';
import { BannerAd, BannerAdSize, AdsConsent } from 'react-native-google-mobile-ads';

export function AdBanner() {
  const { isPremium } = useRevenueCat();
  const [canShowAds, setCanShowAds] = useState(false);
  const [personalizedAds, setPersonalizedAds] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      const consentInfo = await AdsConsent.requestInfoUpdate();
      setCanShowAds(consentInfo.canRequestAds);
      setPersonalizedAds(consentInfo.status === 'OBTAINED');
    };
    checkConsent();
  }, []);

  if (isPremium || !canShowAds) return null;

  return (
    <BannerAd
      unitId={AD_UNIT_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: !personalizedAds }}
    />
  );
}
```

### Option B: Privacy-Friendly Alternatives

| Provider | Privacy | Notes |
|----------|---------|-------|
| **EthicalAds** | High | No tracking, context-based |
| **Carbon Ads** | High | Developer-focused |
| **Self-hosted sponsors** | Highest | Full control |

### Ad Placement Guidelines

```
DO place ads:
  - Friends list screen (bottom banner)
  - Settings screen
  - After completing actions (interstitial)

DON'T place ads:
  - Map screen (safety issue)
  - During proximity alerts
  - Location permission flow
```

---

## Environment Variables

Add to `.env.local`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_YEARLY=price_yyy

# RevenueCat
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=goog_xxx
REVENUECAT_WEBHOOK_SECRET=xxx

# AdMob (if using)
ADMOB_APP_ID_IOS=ca-app-pub-xxx~yyy
ADMOB_APP_ID_ANDROID=ca-app-pub-xxx~zzz
```

---

## Implementation Checklist

1. [ ] Add subscriptions table to D1
2. [ ] Create Stripe account and products
3. [ ] Create RevenueCat account and products
4. [ ] Integrate RevenueCat in Expo app
5. [ ] Add Stripe webhook handler
6. [ ] Implement feature gates (frontend + backend)
7. [ ] Build paywall UI
8. [ ] Add consent-based ads
9. [ ] Test purchase flows (sandbox)
10. [ ] Launch with 7-day free trial

---

## Next Steps

- Read [API.md](./API.md) for adding billing endpoints
- Read [SECURITY.md](./SECURITY.md) for webhook security
- Read [MOBILE.md](./MOBILE.md) for Expo configuration
