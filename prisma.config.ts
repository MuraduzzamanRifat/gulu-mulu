// Prisma 7 moved CLI config out of package.json into this file.
// `.env` is NOT auto-loaded by the Prisma CLI in v7 — hence the dotenv import.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// NOTE: read process.env directly rather than Prisma's env() helper.
// env() THROWS when the variable is missing, which breaks `prisma generate` during
// `pnpm install` on a fresh CI/Vercel box where DATABASE_URL isn't set yet.
// `generate` only reads the schema — it never opens a connection — so it must not
// require a database URL. Commands that DO connect (db push, migrate, seed) will
// still fail loudly and correctly if this is empty.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
