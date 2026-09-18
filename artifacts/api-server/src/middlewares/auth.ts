import { clerkClient, getAuth } from "@clerk/express";
import { accountsTable, db, enqueueEmail, legalConsentsTable, legalSignupIntentsTable, vaultsTable, type Account } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { currentLegalConfiguration, legalSignupIntentHash, verifyLegalSignupIntent } from "../lib/legal";
import { sendEmailNow } from "../lib/mail";

/** Looks up the vault a referral code points to. Never throws on a stale/invalid code. */
async function resolveReferrerVaultId(referrerCode: unknown): Promise<string | null> {
  if (typeof referrerCode !== "string" || !referrerCode.trim()) return null;
  const [vault] = await db.select({ id: vaultsTable.id }).from(vaultsTable).where(eq(vaultsTable.referrerCode, referrerCode.trim())).limit(1);
  return vault?.id ?? null;
}

/**
 * H1: welcome, to the host — queued and sent immediately (build brief addendum 2,
 * section 6.1). Called only after the account-creation transaction has committed, so a
 * failed or slow send never affects account creation.
 */
async function sendWelcomeEmail(account: Account) {
  if (!account.email) return;
  const row = await enqueueEmail({
    dedupeKey: `host-welcome:${account.id}`, eventType: "host_welcome", recipientEmail: account.email,
    payload: {},
  });
  if (row) void sendEmailNow(row.id, "host_welcome");
}

const ADMIN_IDLE_LIMIT_MS = 30 * 60 * 1000;
const ADMIN_ABSOLUTE_LIMIT_MS = 12 * 60 * 60 * 1000;
export const FRESH_MFA_LIMIT_MINUTES = 5;

declare global {
  namespace Express {
    interface Request {
      account?: Account;
      clerkSessionId?: string;
      factorVerificationAge?: [number, number] | null;
      clerkUserId?: string;
    }
  }
}

function unauthorized(res: Response, code: string, message: string) {
  return res.status(401).json({ error: message, code });
}

function forbidden(res: Response, code: string, message: string) {
  return res.status(403).json({ error: message, code });
}

export async function findOrCreateAccount(userId: string): Promise<Account> {
  const [existing] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.clerkSubject, userId))
    .limit(1);
  if (existing) return existing;

  const user = await clerkClient.users.getUser(userId);
  const primaryEmail =
    user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    )?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) {
    throw new Error("Authenticated Clerk user has no verified email address.");
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    primaryEmail.split("@")[0] ||
    "Vault Zombie operator";

  const metadata = user.unsafeMetadata && typeof user.unsafeMetadata === "object"
    ? user.unsafeMetadata as Record<string, unknown>
    : {};
  const clerkAcceptedAt = (user as unknown as { legalAcceptedAt?: Date | number | null }).legalAcceptedAt;
  const clerkDate = clerkAcceptedAt instanceof Date ? clerkAcceptedAt
    : typeof clerkAcceptedAt === "number" ? new Date(clerkAcceptedAt) : undefined;
  if (
    metadata.legalAccepted !== true ||
    !clerkDate ||
    Number.isNaN(clerkDate.getTime())
  ) {
    throw Object.assign(new Error("Current legal acceptance is required before a local account can be created."), { code: "CONSENT_REQUIRED" });
  }

  const intentToken = metadata.legalSignupIntent;
  const intentPayload = verifyLegalSignupIntent(intentToken);
  if (!intentPayload || typeof intentToken !== "string") {
    throw Object.assign(new Error("A valid legal signup intent is required."), { code: "CONSENT_REQUIRED" });
  }
  const created = await db.transaction(async (tx) => {
    const [intent] = await tx
      .select()
      .from(legalSignupIntentsTable)
      .where(eq(legalSignupIntentsTable.tokenHash, legalSignupIntentHash(intentToken)))
      .limit(1)
      .for("update");
    if (!intent || intent.consumedAt || intent.expiresAt.getTime() <= Date.now()
      || intent.nonce !== intentPayload.n || intent.termsVersion !== intentPayload.t
      || intent.privacyVersion !== intentPayload.p || intent.acceptedAt.getTime() !== intentPayload.a
      || intent.expiresAt.getTime() !== intentPayload.e || clerkDate.getTime() + 5000 < intent.acceptedAt.getTime()) {
      throw Object.assign(new Error("The legal signup intent is invalid or already used."), { code: "CONSENT_REQUIRED" });
    }
    const referredByVaultId = await resolveReferrerVaultId(metadata.referrerCode);
    const [inserted] = await tx.insert(accountsTable).values({
      clerkSubject: userId, role: "operator", displayName, email: primaryEmail, referredByVaultId,
    }).onConflictDoNothing({ target: accountsTable.clerkSubject }).returning();
    if (!inserted) return undefined;
    await tx.insert(legalConsentsTable).values({
      accountId: inserted.id,
      termsVersion: intent.termsVersion,
      privacyVersion: intent.privacyVersion,
      acceptedAt: intent.acceptedAt,
      clerkAcceptedAt: clerkDate,
      clerkAcceptanceSource: "clerk_signup",
    });
    await tx.update(legalSignupIntentsTable).set({ consumedAt: new Date(), consumedClerkSubject: userId }).where(eq(legalSignupIntentsTable.id, intent.id));
    return inserted;
  });
  if (created) {
    await sendWelcomeEmail(created);
    return created;
  }

  const [raced] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.clerkSubject, userId))
    .limit(1);
  if (!raced) throw new Error("Unable to create the local operator account.");
  return raced;
}

export async function provisionCurrentConsentAccount(userId: string, config: ReturnType<typeof currentLegalConfiguration>): Promise<Account> {
  const [existing] = await db.select().from(accountsTable).where(eq(accountsTable.clerkSubject, userId)).limit(1);
  if (existing) return existing;
  const user = await clerkClient.users.getUser(userId);
  const email = user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("Authenticated Clerk user has no verified email address.");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || email.split("@")[0] || "Vault Zombie operator";
  const metadata = user.unsafeMetadata && typeof user.unsafeMetadata === "object" ? user.unsafeMetadata as Record<string, unknown> : {};
  const referredByVaultId = await resolveReferrerVaultId(metadata.referrerCode);
  const [created] = await db.transaction(async (tx) => {
    const [account] = await tx.insert(accountsTable).values({ clerkSubject: userId, role: "operator", displayName, email, referredByVaultId }).onConflictDoNothing({ target: accountsTable.clerkSubject }).returning();
    if (!account) return [];
    await tx.insert(legalConsentsTable).values({ accountId: account.id, termsVersion: config.termsVersion, privacyVersion: config.privacyVersion, clerkAcceptanceSource: "operator_reconsent" });
    return [account];
  });
  if (created) {
    await sendWelcomeEmail(created);
    return created;
  }
  const [raced] = await db.select().from(accountsTable).where(eq(accountsTable.clerkSubject, userId)).limit(1);
  if (!raced) throw new Error("Unable to create the local operator account.");
  return raced;
}

export function requireClerkSession(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth.userId || !auth.sessionId) return unauthorized(res, "AUTH_REQUIRED", "Authentication required.");
  req.clerkUserId = auth.userId; req.clerkSessionId = auth.sessionId; req.factorVerificationAge = auth.factorVerificationAge;
  return next();
}

export async function requireAuthenticatedAccount(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    if (!userId || !auth.sessionId) {
      return unauthorized(res, "AUTH_REQUIRED", "Authentication required.");
    }

    const account = await findOrCreateAccount(userId);
    if (account.status !== "active") {
      return forbidden(res, "ACCOUNT_INACTIVE", "This account is inactive.");
    }

    req.account = account;
    req.clerkSessionId = auth.sessionId;
    req.factorVerificationAge = auth.factorVerificationAge;
    return next();
  } catch (error) {
    if ((error as { code?: string }).code === "CONSENT_REQUIRED") {
      return forbidden(res, "CONSENT_REQUIRED", "Current legal acceptance is required.");
    }
    next(error);
  }
}

export async function requireOperator(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await requireAuthenticatedAccount(req, res, async () => {
    try {
      const config = currentLegalConfiguration();
      const [consent] = await db.select({ id: legalConsentsTable.id }).from(legalConsentsTable).where(and(
        eq(legalConsentsTable.accountId, req.account!.id),
        eq(legalConsentsTable.termsVersion, config.termsVersion),
        eq(legalConsentsTable.privacyVersion, config.privacyVersion),
      )).limit(1);
      if (!consent) return forbidden(res, "CONSENT_REQUIRED", "Accept the current Terms and Privacy Policy to continue.");
      return next();
    } catch (error) { return next(error); }
  });
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.account || !req.clerkSessionId) {
    return unauthorized(res, "AUTH_REQUIRED", "Authentication required.");
  }
  if (req.account.role !== "admin") {
    return forbidden(res, "ADMIN_REQUIRED", "Administrator access required.");
  }

  try {
    const [session, clerkUser] = await Promise.all([
      clerkClient.sessions.getSession(req.clerkSessionId),
      clerkClient.users.getUser(req.account.clerkSubject!),
    ]);
    const now = Date.now();
    if (
      now - session.lastActiveAt > ADMIN_IDLE_LIMIT_MS ||
      now - session.createdAt > ADMIN_ABSOLUTE_LIMIT_MS
    ) {
      await clerkClient.sessions.revokeSession(req.clerkSessionId);
      return unauthorized(
        res,
        "ADMIN_SESSION_EXPIRED",
        "The admin session expired. Sign in again.",
      );
    }

    const secondFactorAge = req.factorVerificationAge?.[1];
    // Clerk's backend Session resource exposes factor age but not the strategy
    // that produced it. Require TOTP enrollment and reject accounts with a
    // configured phone number so SMS cannot satisfy the generic age claim.
    // Backup codes remain allowed as the owner's recovery factor.
    if (
      !clerkUser.totpEnabled ||
      clerkUser.phoneNumbers.length > 0 ||
      secondFactorAge == null ||
      secondFactorAge < 0
    ) {
      return forbidden(
        res,
        "ADMIN_TOTP_REQUIRED",
        "Authenticator-app verification is required for administrator access.",
      );
    }
    return next();
  } catch (error) {
    next(error);
  }
}

export function requireFreshMfa(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const secondFactorAge = req.factorVerificationAge?.[1];
  if (
    secondFactorAge == null ||
    secondFactorAge < 0 ||
    secondFactorAge > FRESH_MFA_LIMIT_MINUTES
  ) {
    return res.status(403).json({
      clerk_error: {
        type: "forbidden",
        reason: "reverification-error",
        metadata: {
          reverification: {
            level: "second_factor",
            afterMinutes: FRESH_MFA_LIMIT_MINUTES,
          },
        },
      },
    });
  }
  return next();
}

/**
 * Apply this complete chain to every sensitive-action endpoint. Keeping the
 * chain centralized prevents later actions from omitting a role or MFA gate.
 */
export const sensitiveAdminGuards = [
  requireOperator,
  requireAdmin,
  requireFreshMfa,
] as const;