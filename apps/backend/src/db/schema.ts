// Database schema definitions using Drizzle ORM for a location-sharing application.
/*
Schemmas defined:
1. Users Table
2. Locations Table
3. Friendships Table
4. Blocked Users Table
5. Proximity Events Table
6. Consent Grants Table
7. Blog Posts Table
*/

import { sqliteTable, text, integer, real, check, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table schema
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    deviceSecretHash: text( 'device_secret_hash').notNull().unique(),
    friendCode : text( 'friend_code', { length: 8 }).notNull().unique(),
    displayName: text( 'display_name', { length: 50}),
    mode: text( 'mode', { enum: ['OFF', 'FRIENDS_ONLY', 'EVERYONE'] })
    .notNull()
    .default('OFF'),
    radiusMeters: integer('radius_meters').notNull().default(500),
    showFriendsOnMap: integer('show_friends_on_map', { mode: 'boolean'})
    .notNull()
    .default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms'}).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms'}).notNull(), 
}, (table) => [
    check('mode_check', sql`${table.mode} IN ('OFF', 'FRIENDS_ONLY', 'EVERYONE')`),
    check('radius_check', sql`${table.radiusMeters} BETWEEN 100 AND 5000`),
    check('friend_code_len', sql`LENGTH(${table.friendCode}) = 8`),
]);

// Locations table schema
export const locations = sqliteTable('locations', {
    userId: integer('user_id')
      .primaryKey()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    accuracy: real('accuracy'),
    isSimulated: integer('is_simulated', { mode: 'boolean'}).notNull().default(false),
    updateedAt: integer('updated_at', { mode: 'timestamp_ms'}).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms'}).notNull(),
}, (table) => [
    check('lat_check', sql`${table.latitude} BETWEEN -90 AND 90`),
    check('lon_check', sql`${table.longitude} BETWEEN -180 AND 180`),
    index('expires_at_idx').on(table.expiresAt),
]);

// Friendships table schema
export const friendships = sqliteTable('friendships', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: integer('friend_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['PENDING', 'ACCEPTED']})
      .notNull()
      .default('PENDING'),
    createdAt: integer('created_at', { mode: 'timestamp_ms'}).notNull(),
}, (table) => [
    uniqueIndex('user_friend_unique').on(table.userId, table.friendId),
    index('user_id_idx').on(table.userId),
    index('friend_id_idx').on(table.friendId),
    check('no_self_friend', sql`${table.userId} != ${table.friendId}`)
]);

//Blocked Users table schema
export const blockedUsers = sqliteTable('blocked_users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    blockerId: integer('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: integer('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms'}).notNull(),
}, (table) => [
    uniqueIndex('blocker_blocked_unique').on(table.blockerId, table.blockedId),
    index('blocker_idx').on(table.blockerId),
    index('blocked_idx').on(table.blockedId),
    check('no_self_block', sql`${table.blockerId} != ${table.blockedId}`),
]);

//Proximity Events table schema
export const proximityEvents = sqliteTable('proximity_events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    nearbyUserId: integer('nearby_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    state: text('state', { enum: ['IN', 'OUT'] }).notNull(),
    lasteCheckedAt: integer('last_checked_at', { mode: 'timestamp_ms'}).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms'}).notNull(),
}, (table) => [
    uniqueIndex('paire_unique').on(table.userId, table.nearbyUserId),
    index('proximity_expires_at_idx').on(table.expiresAt),
    check('no_self_proximity', sql`${table.userId} != ${table.nearbyUserId}`),
]);

// Consent Grants table schema
export const consentGrants = sqliteTable('consent_grants', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose', { enum: ['LOCATION', 'CALENDAR', 'CONTACTS', 'ANALYTICS'] }) //Potentially contacts
      .notNull(),
    granted: integer('granted', { mode: 'boolean'}).notNull(),
    version: text('version').notNull(), //Privacy policy version
    grantedAt: integer('granted_at', { mode: 'timestamp_ms'}).notNull(),
    withdrawnAt: integer('withdrawn_at', { mode: 'timestamp_ms'}),
    ipAddress: text('ip_address'), //For audit trail
    userAgent: text('user_agent'), //For audit trail
}, (table) => [
    index('consent_user_idx').on(table.userId),
    index('consent_purpose_idx').on(table.purpose),
]);

// Blog Posts table schema
export const posts = sqliteTable('posts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    content: text('content').notNull(), //Stored as Markdown
    status: text('status', { enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED']})
    .notNull()
    .default('DRAFT'),
    createdAt: integer('created_at', { mode: 'timestamp_ms'}).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms'}).notNull(),
}, (table) => [
    index('posts_slug_idx').on(table.slug),
    index('posts_status_idx').on(table.status),
]);
