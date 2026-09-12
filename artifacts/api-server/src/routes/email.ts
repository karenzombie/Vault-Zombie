import { eq } from "drizzle-orm";
import { db, guestsTable, optOutGuestEmail, resubscribeGuestEmail, vaultsTable } from "@workspace/db";
import { Router, type IRouter, type RequestHandler } from "express";
import { escapeHtml } from "../lib/email/layout";
import { verifyUnsubscribeToken } from "../lib/mail";

const emailRouter: IRouter = Router();

async function loadGuestContext(guestId: string) {
  const [row] = await db
    .select({ guestId: guestsTable.id, emailOptedOut: guestsTable.emailOptedOut, vaultName: vaultsTable.name })
    .from(guestsTable)
    .innerJoin(vaultsTable, eq(guestsTable.vaultId, vaultsTable.id))
    .where(eq(guestsTable.id, guestId))
    .limit(1);
  return row ?? null;
}

function page(body: string) {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Vault Zombie email preferences</title>
<style>
  body { margin:0; padding:0; background:#EDE6D6; font-family:'Afacad Flux', system-ui, sans-serif; color:#241C15; }
  .header { background:#8A5A34; color:#fff; padding:24px; text-align:center; font-size:20px; font-weight:600; letter-spacing:0.02em; }
  .card { max-width:480px; margin:32px auto; background:#fff; border:1px solid #D8CBB0; border-radius:12px; padding:32px; text-align:center; }
  h1 { font-size:20px; margin:0 0 12px; }
  p { font-size:15px; line-height:1.5; color:#4A4136; }
  button { appearance:none; border:0; border-radius:8px; padding:12px 24px; font-size:15px; font-weight:600; cursor:pointer; margin-top:16px; }
  .unsub { background:#8A5A34; color:#fff; }
  .resub { background:#3E6B4F; color:#fff; }
  .status { display:none; margin-top:16px; font-weight:600; }
  .status.show { display:block; }
</style></head>
<body><div class="header">Vault Zombie</div><div class="card">${body}</div></body></html>`;
}

const showUnsubscribePage: RequestHandler = async (req, res, next) => {
  try {
    const guestIdParam = String(req.params.guestId);
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!verifyUnsubscribeToken(guestIdParam, token)) {
      return res.status(400).type("html").send(page("<h1>Link no longer valid</h1><p>This email preference link is invalid or expired.</p>"));
    }
    const guest = await loadGuestContext(guestIdParam);
    if (!guest) return res.status(404).type("html").send(page("<h1>Not found</h1><p>We could not find this guest record.</p>"));
    const encodedToken = escapeHtml(token);
    const guestId = escapeHtml(guest.guestId);
    const vaultName = escapeHtml(guest.vaultName);
    const body = guest.emailOptedOut
      ? `<h1>You're unsubscribed</h1><p>You will not receive further Vault Zombie emails for <strong>${vaultName}</strong>. You can still submit and see your own predictions in the app; you just won't get emailed about them.</p>
         <button class="resub" id="action">Resubscribe to ${vaultName} emails</button>
         <p class="status" id="result"></p>
         <script>
           document.getElementById('action').addEventListener('click', async function () {
             const res = await fetch('/api/email/resubscribe/${guestId}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: '${encodedToken}' }) });
             document.getElementById('result').className = 'status show';
             document.getElementById('result').textContent = res.ok ? "You're resubscribed." : 'Something went wrong. Please try again.';
             if (res.ok) document.getElementById('action').remove();
           });
         </script>`
      : `<h1>Manage your email</h1><p>You are currently subscribed to emails about your predictions in <strong>${vaultName}</strong>. Unsubscribing means no unlock and no outcome updates, because results are not shown through guest links.</p>
         <button class="unsub" id="action">Unsubscribe from ${vaultName} emails</button>
         <p class="status" id="result"></p>
         <script>
           document.getElementById('action').addEventListener('click', async function () {
             const res = await fetch('/api/email/unsubscribe/${guestId}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: '${encodedToken}' }) });
             document.getElementById('result').className = 'status show';
             document.getElementById('result').textContent = res.ok ? "You're unsubscribed." : 'Something went wrong. Please try again.';
             if (res.ok) document.getElementById('action').remove();
           });
         </script>`;
    return res.type("html").send(page(body));
  } catch (error) { return next(error); }
};

emailRouter.get("/email/unsubscribe/:guestId", showUnsubscribePage);
emailRouter.get("/email/manage/:guestId", showUnsubscribePage);

emailRouter.post("/email/unsubscribe/:guestId", async (req, res, next) => {
  try {
    const guestIdParam = String(req.params.guestId);
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    if (!verifyUnsubscribeToken(guestIdParam, token)) return res.status(400).json({ error: "Invalid unsubscribe link." });
    await optOutGuestEmail(guestIdParam);
    return res.json({ status: "unsubscribed" });
  } catch (error) { return next(error); }
});

emailRouter.post("/email/resubscribe/:guestId", async (req, res, next) => {
  try {
    const guestIdParam = String(req.params.guestId);
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    if (!verifyUnsubscribeToken(guestIdParam, token)) return res.status(400).json({ error: "Invalid unsubscribe link." });
    await resubscribeGuestEmail(guestIdParam);
    return res.json({ status: "subscribed" });
  } catch (error) { return next(error); }
});

export default emailRouter;
