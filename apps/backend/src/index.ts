// Main Hono application entry point
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types/env';
import { errors } from './lib/errors';

// Import routes
import { authRoutes } from './routes/authentication';
import { userSettingsRoutes } from './routes/userSettings';
import { locationRoutes, nearbyRoutes } from './routes/location';
import { friendRoutes } from './routes/friends';
import { privacyRoutes } from './routes/privacy';
import { blogRoutes } from './routes/blog';

// Create app with typed bindings and variables
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================================
// Global Middleware
// ============================================================================

// Request logging
app.use('*', logger());

// CORS configuration
app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:4321',       // Local web dev
      'http://localhost:8081',       // Local mobile dev (Expo)
      'https://beepd.app',           // Production web
      'https://preview.beepd.tech',  // Preview web
    ];
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return '*';
    return allowed.includes(origin) ? origin : null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================================
// Health Check
// ============================================================================

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API Routes
// ============================================================================

// Public routes (no auth required)
app.route('/auth', authRoutes);
app.route('/blog', blogRoutes);

// Protected routes (auth required - middleware applied in each route file)
app.route('/me/settings', userSettingsRoutes);
app.route('/me/location', locationRoutes);
app.route('/nearby', nearbyRoutes);
app.route('/friends', friendRoutes);
app.route('/me', privacyRoutes);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.notFound((c) => {
  return errors.notFound(c, 'Route not found');
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const message = c.env.ENVIRONMENT === 'production'
    ? 'Internal server error'
    : err.message;
  
  return errors.internal(c, message);
});

// ============================================================================
// Export for Cloudflare Workers
// ============================================================================

export default app;
