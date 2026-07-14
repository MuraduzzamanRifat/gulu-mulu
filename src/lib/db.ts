import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/generated/prisma/client'

// Prisma 7 requires an explicit driver adapter — there is no built-in engine anymore.
// Swapping to Postgres later = replace this with `new PrismaPg({ connectionString })`.
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
})

// Reuse the client across hot reloads in dev, or every save leaks a connection.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
