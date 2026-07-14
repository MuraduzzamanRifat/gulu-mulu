import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

// Prisma 7 requires an explicit driver adapter — there is no built-in query engine.
//
// DATABASE_URL must be the POOLED Neon endpoint (…-pooler.…). Serverless opens a fresh
// connection on every cold start, and Postgres caps connections hard — without the
// pooler in front, a modest traffic spike exhausts them and every request starts failing.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

// Reuse the client across hot reloads in dev, or every save leaks a connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
