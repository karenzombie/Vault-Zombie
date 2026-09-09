import { readFile } from "node:fs/promises"; import pg from "pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to install legal signup intent triggers.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect(); try { await client.query(await readFile(new URL("../sql/legal-signup-intent-lifecycle.sql", import.meta.url), "utf8")); } finally { await client.end(); }