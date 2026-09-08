import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to verify audit immutability triggers.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query("select tgname from pg_trigger where tgrelid = 'audit_events'::regclass and not tgisinternal and tgname in ('audit_events_no_update', 'audit_events_no_delete') order by tgname");
  if (rows.length !== 2) throw new Error("append-only audit triggers are not installed.");
  console.log(rows.map((row) => row.tgname).join(", "));
} finally {
  await client.end();
}