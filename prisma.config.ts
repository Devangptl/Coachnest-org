// Prisma CLI configuration (Prisma 7+). Datasource URLs moved here from the
// datasource block in schema.prisma; .env files are no longer auto-loaded.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: [".env", ".env.local"], quiet: true });

const url = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

// The datasource is only needed by commands that touch the DB (migrate, db
// push, studio). Omit it when DATABASE_URL is absent so `prisma generate`
// still works in environments without credentials (CI, postinstall).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(url && {
    datasource: {
      url,
      ...(directUrl && { directUrl }),
    },
  }),
});
