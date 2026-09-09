import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to verify legal consent immutability triggers.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query("select tgname from pg_trigger where tgrelid = 'legal_consents'::regclass and not tgisinternal and tgname in ('legal_consents_no_update', 'legal_consents_no_delete') order by tgname");
  if (rows.length !== 2) throw new Error("append-only legal consent triggers are not installed.");
  console.log(rows.map((row) => row.tgname).join(", "));
} finally {
  await client.end();
}