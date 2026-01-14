# Frontend Architecture

> Astro, React islands, state management, and the web marketing site.

## Overview

The web frontend uses **Astro** with **React islands** for a hybrid static/SSR architecture. This approach delivers fast page loads with zero JavaScript by default, only hydrating interactive components where needed.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Astro 4.x | Static + SSR hybrid rendering |
| UI Components | React 18 | Interactive islands |
| Styling | Tailwind CSS | Utility-first CSS |
| Component Library | shadcn/ui | Accessible React components |
| State Management | Zustand | Client-side state |
| Server State | TanStack Query | API data fetching/caching |
| Maps | React-Leaflet | Interactive maps (web) |

## Project Structure

```
apps/web/
├── src/
│   ├── pages/
│   │   ├── index.astro              # Landing page (static)
│   │   ├── features.astro           # Features page (static)
│   │   ├── pricing.astro            # Pricing page (static)
│   │   ├── about.astro              # About/team (static)
│   │   ├── privacy.astro            # Privacy policy (static)
│   │   ├── demo.astro               # Interactive demo wrapper
│   │   ├── admin/
│   │   │   └── posts.astro          # Blog admin (protected, SSR)
│   │   └── blog/
│   │       ├── index.astro          # Blog listing (SSR from D1)
│   │       └── [slug].astro         # Blog post (SSR from D1)
│   │
│   ├── components/
│   │   ├── react/                   # React islands (client-side)
│   │   │   ├── InteractiveDemo.tsx  # Full demo experience
│   │   │   ├── MapPreview.tsx       # Leaflet map component
│   │   │   ├── SharingToggle.tsx    # Mode selector
│   │   │   ├── NearbyList.tsx       # Simulated nearby users
│   │   │   └── BlogEditor.tsx       # Markdown editor for admin
│   │   │
│   │   └── astro/                   # Static Astro components
│   │       ├── Header.astro
│   │       ├── Footer.astro
│   │       ├── Hero.astro
│   │       ├── FeatureCard.astro
│   │       └── BlogCard.astro
│   │
│   ├── layouts/
│   │   ├── Layout.astro             # Base layout with SEO
│   │   ├── BlogLayout.astro         # Blog post layout
│   │   └── AdminLayout.astro        # Protected admin layout
│   │
│   └── lib/
│       ├── api.ts                   # API client
│       └── seo.ts                   # SEO utilities
│
├── public/
│   ├── favicon.ico
│   ├── og-image.png
│   ├── _headers                     # CSP headers
│   └── robots.txt
│
├── astro.config.mjs
├── tailwind.config.ts
└── package.json
```

## Astro + React Islands

Astro renders static HTML by default. React components become interactive "islands" only where needed:

```astro
---
// src/pages/demo.astro
import Layout from '../layouts/Layout.astro';
import InteractiveDemo from '../components/react/InteractiveDemo';
---

<Layout title="Try Beepd" description="Interactive demo - no signup required">
  <section class="hero">
    <h1>Try the Demo</h1>
    <p>Experience Beepd without installing the app</p>
  </section>
  
  <!-- React island: only this component ships JavaScript -->
  <InteractiveDemo client:visible />
  
  <section class="cta">
    <a href="/download">Download the App</a>
  </section>
</Layout>
```

### Client Directives

| Directive | When JS Loads | Use Case |
|-----------|---------------|----------|
| `client:load` | Immediately on page load | Critical interactive UI |
| `client:visible` | When scrolled into viewport | Demo below the fold |
| `client:idle` | When browser is idle | Non-critical interactivity |
| `client:only="react"` | Client-only (no SSR) | Maps, heavy components |
| *(none)* | Never (static HTML) | Marketing copy, cards |

## State Management (Zustand)

### Why Zustand

- **Simple**: No boilerplate, no providers (works in Astro islands)
- **TypeScript**: Excellent type inference
- **Persist**: Built-in localStorage/sessionStorage middleware
- **React Native**: Works identically in Expo

### Demo Store

```typescript
// packages/ui/src/stores/demoStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DemoState {
  userLocation: { lat: number; lng: number } | null;
  sharingMode: 'OFF' | 'FRIENDS_ONLY' | 'EVERYONE';
  radiusMeters: number;
  simulatedFriends: SimulatedUser[];
  nearbyAlerts: number[];
  
  setLocation: (loc: { lat: number; lng: number }) => void;
  setSharingMode: (mode: DemoState['sharingMode']) => void;
  setRadius: (meters: number) => void;
  triggerProximityCheck: () => void;
  reset: () => void;
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      userLocation: null,
      sharingMode: 'OFF',
      radiusMeters: 500,
      simulatedFriends: MOCK_FRIENDS,
      nearbyAlerts: [],
      
      setLocation: (loc) => {
        set({ userLocation: loc });
        get().triggerProximityCheck();
      },
      
      setSharingMode: (mode) => set({ sharingMode: mode }),
      setRadius: (meters) => set({ radiusMeters: meters }),
      
      triggerProximityCheck: () => {
        const { userLocation, simulatedFriends, radiusMeters, sharingMode } = get();
        if (!userLocation || sharingMode === 'OFF') {
          set({ nearbyAlerts: [] });
          return;
        }
        
        const nearby = simulatedFriends
          .filter(friend => {
            const distance = calculateDistance(userLocation, friend);
            return distance <= radiusMeters;
          })
          .map(f => f.id);
        
        set({ nearbyAlerts: nearby });
      },
      
      reset: () => set({
        userLocation: null,
        sharingMode: 'OFF',
        radiusMeters: 500,
        nearbyAlerts: [],
      }),
    }),
    {
      name: 'beepd-demo',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### Auth Store

```typescript
// packages/ui/src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAdmin: false,
      
      login: (token) => {
        const payload = JSON.parse(atob(token.split('.')[1]));
        set({ token, isAdmin: payload.admin === true });
      },
      
      logout: () => set({ token: null, isAdmin: false }),
    }),
    {
      name: 'beepd-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

## Blog System (D1 + SSR)

### SSR Blog Page

```astro
---
// src/pages/blog/[slug].astro
import BlogLayout from '../../layouts/BlogLayout.astro';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export const prerender = false; // Enable SSR

const { slug } = Astro.params;
const runtime = Astro.locals.runtime;

// Fetch from D1 via Worker binding
const post = await runtime.env.DB.prepare(
  'SELECT * FROM posts WHERE slug = ? AND status = ?'
).bind(slug, 'PUBLISHED').first();

if (!post) {
  return Astro.redirect('/404');
}

// Render markdown and sanitize
const htmlContent = DOMPurify.sanitize(
  marked.parse(post.content),
  {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 
                   'strong', 'em', 'code', 'pre', 'blockquote', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel']
  }
);
---

<BlogLayout title={post.title} description={post.excerpt}>
  <article class="prose prose-lg max-w-none">
    <h1>{post.title}</h1>
    <time datetime={new Date(post.publishedAt).toISOString()}>
      {new Date(post.publishedAt).toLocaleDateString()}
    </time>
    <div set:html={htmlContent} />
  </article>
</BlogLayout>
```

## SEO Configuration

```astro
---
// src/layouts/Layout.astro
interface Props {
  title: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
}

const { 
  title, 
  description = 'Privacy-first location sharing for friends',
  image = '/og-image.png',
  type = 'website',
} = Astro.props;

const canonicalUrl = new URL(Astro.url.pathname, Astro.site);
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>{title} | Beepd</title>
  <meta name="description" content={description}>
  <link rel="canonical" href={canonicalUrl}>
  
  <!-- Open Graph -->
  <meta property="og:type" content={type}>
  <meta property="og:url" content={canonicalUrl}>
  <meta property="og:title" content={title}>
  <meta property="og:description" content={description}>
  <meta property="og:image" content={new URL(image, Astro.site)}>
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content={title}>
  <meta name="twitter:description" content={description}>
  <meta name="twitter:image" content={new URL(image, Astro.site)}>
</head>
<body>
  <slot />
</body>
</html>
```

## Security Headers

```
# apps/web/public/_headers
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://api.beepd.app; frame-ancestors 'none'; object-src 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
```

## HTML Injection Security

When using `set:html` (like React's `dangerouslySetInnerHTML`), always sanitize:

```typescript
import DOMPurify from 'isomorphic-dompurify';

const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'hr', 'strong', 'em', 'u', 's',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img',
    'code', 'pre', 'blockquote',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class',
    'target', 'rel', 'width', 'height',
  ],
  FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

const safeHtml = DOMPurify.sanitize(rawHtml, DOMPURIFY_CONFIG);
```

## Astro Cloudflare Adapter

```javascript
// apps/web/astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'hybrid', // Static by default, SSR where needed
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    react(),
    tailwind(),
  ],
  vite: {
    resolve: {
      alias: {
        '@beepd/ui': '../../packages/ui/src',
        '@beepd/api-client': '../../packages/api-client/src',
      },
    },
  },
});
```

See also:
- [Mobile Architecture](MOBILE.md)
- [Architecture Overview](ARCHITECTURE.md)
