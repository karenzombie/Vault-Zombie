import { clerkClient, getAuth } from "@clerk/express";
import { accountsTable, db, type Account } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

const ADMIN_IDLE_LIMIT_MS = 30 * 60 * 1000;
const ADMIN_ABSOLUTE_LIMIT_MS = 12 * 60 * 60 * 1000;
export const FRESH_MFA_LIMIT_MINUTES = 5;

declare global {
  namespace Express {
    interface Request {
      account?: Account;
      clerkSessionId?: string;
      factorVerificationAge?: [number, number] | null;
    }
  }
}

function unauthorized(res: Response, code: string, message: string) {
  return res.status(401).json({ error: message, code });
}

function forbidden(res: Response, code: string, message: string) {
  return res.status(403).json({ error: message, code });
}

async function findOrCreateAccount(userId: string): Promise<Account> {
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

  const [created] = await db
    .insert(accountsTable)
    .values({
      clerkSubject: userId,
      role: "operator",
      displayName,
      email: primaryEmail,
    })
    .onConflictDoNothing({ target: accountsTable.clerkSubject })
    .returning();
  if (created) return created;

  const [raced] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.clerkSubject, userId))
    .limit(1);
  if (!raced) throw new Error("Unable to create the local operator account.");
  return raced;
}

export async function requireOperator(
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
    next(error);
  }
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