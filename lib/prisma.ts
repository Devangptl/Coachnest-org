/**
 * Prisma Client singleton.
 *
 * In development, Next.js hot-reload creates new module instances on every
 * file change, which would exhaust the DB connection pool. We work around
 * this by caching the client on the global object.
 *
 * Prisma 7 requires a driver adapter — we use @prisma/adapter-pg (node-postgres)
 * against the pooled Supabase connection string.
 */
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
