// Creates the first (and only) VaultZombie administrator account.
//
// Run with: pnpm --filter @workspace/scripts run create:admin
//
// Prompts for an email address and nothing else, then:
//   1. Creates a Clerk user with that email as a verified primary email
//      address, no password, and no phone number.
//   2. Inserts an accounts row (role admin, status active) for that user.
//   3. Inserts a legal_consents row for that account at the current Terms
//      and Privacy versions, in the same transaction as step 2.
//
// Idempotent: if a local account already exists for the supplied email, the
// script reports what exists and changes nothing. It never creates a second
// admin silently.
import { createInterface } from "node:readline/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClerkClient } from "@clerk/backend";
import { accountsTable, db, legalConsentsTable } from "@workspace/db";
import { legalConfiguration } from "@workspace/legal";
import { eq } from "drizzle-orm";

// This script runs from scripts/ (one level under the workspace root), unlike
// the api-server, which always runs from a two-level-deep artifact directory.
// legalConfiguration()'s cwd-based default assumes that two-level depth, so
// this script computes its own workspace root from its file location instead
// and passes it explicitly, calling the same source rather than duplicating it.
const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function promptForEmail(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("Administrator email address: ");
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is required.");

  const email = await promptForEmail();
  if (!email) throw new Error("An email address is required.");

  const [existingAccount] = await db.select().from(accountsTable).where(eq(accountsTable.email, email)).limit(1);
  if (existingAccount) {
    console.log("An account for this email already exists. Nothing was changed.");
    console.log(`  id: ${existingAccount.id}`);
    console.log(`  role: ${existingAccount.role}`);
    console.log(`  status: ${existingAccount.status}`);
    console.log(`  clerk_subject: ${existingAccount.clerkSubject}`);
    return;
  }

  const config = legalConfiguration(process.env, WORKSPACE_ROOT);

  const clerkClient = createClerkClient({ secretKey });

  const existingUsers = await clerkClient.users.getUserList({ emailAddress: [email] });
  let clerkUser = existingUsers.data.find((user) => user.emailAddresses.some((address) => address.emailAddress === email));

  if (clerkUser) {
    if (clerkUser.phoneNumbers.length > 0) {
      throw new Error(`A Clerk user already exists for ${email} with a phone number on file. requireAdmin rejects accounts with a phone number, so this account cannot be used as-is. Resolve this in Clerk before retrying.`);
    }
    console.log(`Reusing existing Clerk user ${clerkUser.id} for ${email} (no local account found for it yet).`);
  } else {
    clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      skipPasswordRequirement: true,
    });
    console.log(`Created Clerk user ${clerkUser.id} for ${email}.`);
  }

  const displayName = email.split("@")[0] || email;

  const created = await db.transaction(async (tx) => {
    const [account] = await tx.insert(accountsTable).values({
      clerkSubject: clerkUser!.id,
      role: "admin",
      status: "active",
      displayName,
      email,
    }).onConflictDoNothing({ target: accountsTable.clerkSubject }).returning();
    if (!account) return undefined;
    await tx.insert(legalConsentsTable).values({
      accountId: account.id,
      termsVersion: config.termsVersion,
      privacyVersion: config.privacyVersion,
      clerkAcceptanceSource: "admin_provision",
    });
    return account;
  });

  if (!created) {
    const [raced] = await db.select().from(accountsTable).where(eq(accountsTable.clerkSubject, clerkUser.id)).limit(1);
    console.log("An account for this Clerk user already exists. Nothing was changed.");
    if (raced) {
      console.log(`  id: ${raced.id}`);
      console.log(`  role: ${raced.role}`);
      console.log(`  status: ${raced.status}`);
    }
    return;
  }

  console.log("Administrator account created.");
  console.log(`  account id: ${created.id}`);
  console.log(`  clerk_subject: ${created.clerkSubject}`);
  console.log(`  email: ${created.email}`);
  console.log(`  terms version: ${config.termsVersion}`);
  console.log(`  privacy version: ${config.privacyVersion}`);
  console.log("No password is set. The owner sets one at /admin/sign-in using forgot password.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
