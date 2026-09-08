import { logger } from "./lib/logger";
import { runEmailCycle } from "./lib/mail";

try { logger.info(await runEmailCycle(), "Email worker cycle completed"); }
catch (err) { logger.error({ err }, "Email worker cycle failed"); process.exitCode = 1; }