import app from "./app";
import { logger } from "./lib/logger";
import { runEmailCycle } from "./lib/mail";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const EMAIL_CYCLE_INTERVAL_MS = 15 * 60_000;

// Guards against two email cycles running at once. A cycle triggered while
// another is still in flight (the startup run overlapping the first aligned
// tick, or a tick firing late) is skipped rather than queued.
let emailCycleRunning = false;

async function runGuardedEmailCycle(reason: string) {
  if (emailCycleRunning) {
    logger.warn({ reason }, "Skipped email cycle because the previous run is still in progress");
    return;
  }
  emailCycleRunning = true;
  try {
    const result = await runEmailCycle();
    logger.info({ reason, ...result }, "Email cycle completed");
  } catch (err) {
    logger.error({ err, reason }, "Email cycle failed");
  } finally {
    emailCycleRunning = false;
  }
}

// Schedules the next email cycle for the next wall-clock quarter hour (:00,
// :15, :30, :45), then reschedules itself after that cycle finishes so the
// timer always re-aligns to the clock instead of drifting with run duration.
function scheduleNextEmailCycle() {
  const now = new Date();
  const msIntoHour = now.getMinutes() * 60_000 + now.getSeconds() * 1000 + now.getMilliseconds();
  const msUntilNextSlot = EMAIL_CYCLE_INTERVAL_MS - (msIntoHour % EMAIL_CYCLE_INTERVAL_MS);
  setTimeout(() => {
    void runGuardedEmailCycle("recurring-timer").finally(scheduleNextEmailCycle);
  }, msUntilNextSlot);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // A restart safely reclaims stale rows, so it's safe to also run once
  // immediately here. The recurring schedule itself is the in-process timer
  // set up by scheduleNextEmailCycle below, which runs every 15 minutes
  // aligned to the clock (:00, :15, :30, :45); nothing external needs to
  // invoke this process on a schedule.
  void runGuardedEmailCycle("startup");
  scheduleNextEmailCycle();
});
