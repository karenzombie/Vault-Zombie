import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
export * from "./audit";
export * from "./content-import";
export * from "./schedule";
export * from "./sealed-content";
export * from "./sensitive-action";
export * from "./vault-setup";
export * from "./vault-lifecycle";
export * from "./guest-flow";
export * from "./email";
export * from "./reveal-scoring";
export * from "./reports";
export * from "./refund-reservations";
export * from "./refund-state";
export * from "./urls";
export * from "./timezone";
