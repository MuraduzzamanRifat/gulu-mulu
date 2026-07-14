// Prisma 7 moved CLI config out of package.json into this file.
// `.env` is NOT auto-loaded by the Prisma CLI in v7 — hence the dotenv import.
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
