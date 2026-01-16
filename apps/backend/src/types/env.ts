// Cloudflare Worker environment bindings
export interface Env {
  // D1 Database binding
  DB: D1Database;
  
  // Secrets (set via `wrangler secret put`)
  JWT_SECRET: string;
  
  // Environment variables (set in wrangler.toml)
  ENVIRONMENT: 'development' | 'preview' | 'production';
}

// Context variables set by middleware
export interface Variables {
  userId: number;
}
