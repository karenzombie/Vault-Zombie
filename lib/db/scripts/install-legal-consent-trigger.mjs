import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to install legal consent immutability triggers.");
const sql = await readFile(new URL("../sql/append-only-legal-consents.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(sql);
} finally {
  await client.end();
}