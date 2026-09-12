import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { AcceptLegalConsentBody, AcceptLegalConsentResponse, CreateLegalSignupIntentBody, CreateLegalSignupIntentResponse, GetLegalStatusResponse } from "@workspace/api-zod";
import { db, legalConsentsTable, legalSignupIntentsTable } from "@workspace/db";
import { createLegalSignupIntent, currentLegalConfiguration } from "../lib/legal";
import { findOrCreateAccount, provisionCurrentConsentAccount, requireClerkSession } from "../middlewares/auth";

const legalRouter: IRouter = Router();
const publicConfig = () => {
  const config = currentLegalConfiguration();
  return { termsVersion: config.termsVersion, privacyVersion: config.privacyVersion, termsUrl: "/terms", privacyUrl: "/privacy" };
};

legalRouter.get("/legal", (_req, res) => res.json(publicConfig()));

legalRouter.post("/legal/signup-intent", async (req, res, next): Promise<void> => {
  try {
    const snapshot = currentLegalConfiguration();
    const body = CreateLegalSignupIntentBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "Explicit legal acceptance is required.", code: "VALIDATION_ERROR" }); return; }
    const config = { termsVersion: snapshot.termsVersion, privacyVersion: snapshot.privacyVersion, termsUrl: "/terms" as const, privacyUrl: "/privacy" as const };
    if ((body.data.termsVersion && body.data.termsVersion !== config.termsVersion) || (body.data.privacyVersion && body.data.privacyVersion !== config.privacyVersion)) { res.status(409).json({ error: "The legal document versions are no longer current.", code: "LEGAL_VERSION_STALE" }); return; }
    const intent = createLegalSignupIntent(snapshot);
    await db.insert(legalSignupIntentsTable).values({ nonce: intent.n, tokenHash: intent.tokenHash, termsVersion: intent.t, privacyVersion: intent.p, acceptedAt: intent.acceptedAt, expiresAt: intent.expiresAt });
    res.json(CreateLegalSignupIntentResponse.parse({ ...config, token: intent.token, expiresAt: intent.expiresAt }));
  } catch (error) { next(error); }
});

legalRouter.get("/legal/status", requireClerkSession, async (req, res, next): Promise<void> => {
  try {
    const config = publicConfig();
    let account: { id: string } | undefined;
    try {
      account = await findOrCreateAccount(req.clerkUserId!);
    } catch (error) {
      // A signed-in Clerk user with no local account yet and no valid
      // sign-up consent to consume (e.g. legacy session, malformed intent)
      // is reported as not-yet-accepted rather than surfaced as an error;
      // the ConsentGate flow below is what creates the account in that case.
      if ((error as { code?: string }).code === "CONSENT_REQUIRED") {
        res.json(GetLegalStatusResponse.parse({ ...config, accepted: false, acceptedAt: null }));
        return;
      }
      throw error;
    }
    const [consent] = await db.select().from(legalConsentsTable).where(and(eq(legalConsentsTable.accountId, account.id), eq(legalConsentsTable.termsVersion, config.termsVersion), eq(legalConsentsTable.privacyVersion, config.privacyVersion))).orderBy(desc(legalConsentsTable.acceptedAt)).limit(1);
    res.json(GetLegalStatusResponse.parse({ ...config, accepted: Boolean(consent), acceptedAt: consent?.acceptedAt?.toISOString() ?? null }));
  } catch (error) { next(error); }
});

legalRouter.post("/legal/consent", requireClerkSession, async (req, res, next): Promise<void> => {
  try {
    const snapshot = currentLegalConfiguration();
    const body = AcceptLegalConsentBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "Invalid legal consent.", code: "VALIDATION_ERROR" }); return; }
    const config = { termsVersion: snapshot.termsVersion, privacyVersion: snapshot.privacyVersion, termsUrl: "/terms" as const, privacyUrl: "/privacy" as const };
    if (body.data.termsVersion !== config.termsVersion || body.data.privacyVersion !== config.privacyVersion) { res.status(409).json({ error: "The legal document versions are no longer current.", code: "LEGAL_VERSION_STALE" }); return; }
    const account = await provisionCurrentConsentAccount(req.clerkUserId!, snapshot);
    await db.insert(legalConsentsTable).values({ accountId: account.id, termsVersion: config.termsVersion, privacyVersion: config.privacyVersion, clerkAcceptanceSource: "operator_reconsent" }).onConflictDoNothing();
    const [consent] = await db.select().from(legalConsentsTable).where(and(eq(legalConsentsTable.accountId, account.id), eq(legalConsentsTable.termsVersion, config.termsVersion), eq(legalConsentsTable.privacyVersion, config.privacyVersion))).limit(1);
    res.json(AcceptLegalConsentResponse.parse({ ...config, accepted: Boolean(consent), acceptedAt: consent?.acceptedAt?.toISOString() ?? null }));
  } catch (error) { next(error); }
});
export default legalRouter;