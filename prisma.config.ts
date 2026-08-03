import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI commands (db push/migrate/introspect) need a direct, non-pooled
    // connection for DDL; the running app uses DATABASE_URL (pooled) via
    // lib/prisma.ts instead.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
