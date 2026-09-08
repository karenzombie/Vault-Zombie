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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // A restart safely reclaims stale rows; production deployments should invoke
  // this one-shot processor on a recurring process schedule as well.
  void runEmailCycle().catch((err) => logger.error({ err }, "Startup email cycle failed"));
});
