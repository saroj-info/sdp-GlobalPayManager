import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import pg from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const DATABASE_URL = process.env.DATABASE_URL;

function createDb() {
  if (DATABASE_URL.includes('neon.tech')) {
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString: DATABASE_URL });
    return { pool, db: neonDrizzle({ client: pool, schema }) };
  } else {
    const pool = new pg.Pool({ connectionString: DATABASE_URL });
    return { pool, db: pgDrizzle({ client: pool, schema }) };
  }
}

export const { pool, db } = createDb();
