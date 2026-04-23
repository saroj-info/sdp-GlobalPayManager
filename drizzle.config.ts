import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Log which database drizzle-kit is about to operate on (masked — no password)
try {
  const u = new URL(process.env.DATABASE_URL);
  console.log(`[drizzle] using host=${u.hostname} db=${u.pathname.replace(/^\//, '')} user=${u.username}`);
} catch {}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
