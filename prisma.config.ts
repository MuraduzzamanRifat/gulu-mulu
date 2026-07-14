// Prisma 7 moved CLI config out of package.json into this file.
// `.env` is NOT auto-loaded by the Prisma CLI in v7 — hence the dotenv import.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// The CLI (db push / migrate / seed) needs a DIRECT, UNPOOLED connection: a transaction
// pooler cannot run DDL, so `db push` against the pooled URL fails in confusing ways.
//
// Neon's Vercel integration names that variable DATABASE_URL_UNPOOLED (and also exposes
// POSTGRES_URL_NON_POOLING). Locally we call it DIRECT_URL. Accept any of them, and fall
// back to the pooled DATABASE_URL so a plain single-URL setup still works.
const directUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  ''

// Read process.env directly rather than Prisma's env() helper: env() THROWS on a missing
// variable, which breaks `prisma generate` during `pnpm install` on a fresh CI box where
// nothing is set yet. `generate` only reads the schema and never connects, so it must not
// require a URL. Commands that genuinely connect still fail loudly if this is empty.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: directUrl,
  },
})
