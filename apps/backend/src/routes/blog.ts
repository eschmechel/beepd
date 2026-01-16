// Blog routes: /blog/* (public, no auth required)

import { Hono } from 'hono';
import { eq, desc, count, and } from 'drizzle-orm';
import type { Env, Variables } from '../types/env';
import { createDb } from '../lib/db';
import { errors } from '../lib/errors';
import { blogSlugParamSchema, blogQuerySchema } from '../validators/schemas';
import { posts } from '../db/schema';

export const blogRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// No auth middleware - these are public routes

/**
 * GET /blog/posts
 * List all published blog posts (paginated)
 * Query params: page (default 1), limit (default 10, max 50)
 */
blogRoutes.get('/posts', async (c) => {

  const params = Object.fromEntries(c.req.query() as any);
  const parsed = blogQuerySchema.safeParse(params);
  if (!parsed.success) return errors.badRequest(c,parsed.error.issues[0].message);
  
  const page = parsed.data.page;
  const limit = parsed.data.limit;
  const offset = (page -1 ) * limit;3


  const db = createDb(c.env.DB);
  const [postsList, totalResult] = await Promise.all([
    db.query.posts.findMany({
      where: eq(posts.status, 'PUBLISHED'),
      orderBy: desc(posts.createdAt),
      limit,
      offset,
    }),
    db.select({ count: count() })
      .from(posts)
      .where(eq(posts.status, 'PUBLISHED')),
  ]);

  const total = totalResult[0]?.count ?? 0;

  const hasMore = (page * limit) < total;

  return c.json({
    posts: postsList, 
    pagination: {
      page,
      limit,
      total,
      hasMore
    }
  }, 200);
});

/**
 * GET /blog/posts/:slug
 * Get a single published blog post by slug
 */
blogRoutes.get('/posts/:slug', async (c) => {

  const params = Object.fromEntries(c.req.query() as any);
  const parsed = blogSlugParamSchema.safeParse(params);
  if (!parsed.success) return errors.badRequest(c,parsed.error.issues[0].message);

  //No verify as Schema already checked
  const slug = parsed.data.slug;

  const db = createDb(c.env.DB);
  const post = await db.query.posts.findFirst({
    where: and(
      eq(posts.slug, slug),
      eq(posts.status, 'PUBLISHED'),
    ),
    columns: {title: true, slug: true, content: true, createdAt: true, updatedAt: true },
  })
  if (!post) return errors.notFound(c, "Blog not found");
  return c.json({article: post}, 200);
});
