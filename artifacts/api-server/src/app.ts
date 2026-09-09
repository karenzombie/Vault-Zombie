import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { BackupConfigurationError } from "./lib/admin-backup";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { stripeWebhookBoundary } from "./routes/stripe-webhook";
import { currentLegalConfiguration, LegalConfigurationError } from "./lib/legal";

const app: Express = express();

function isValidationError(error: unknown): error is { issues: unknown[] } {
  return (
    error instanceof Error &&
    error.name === "ZodError" &&
    "issues" in error &&
    Array.isArray(error.issues)
  );
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.post("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookBoundary);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

function serveLegalDocument(kind: "terms" | "privacy") {
  return (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const config = currentLegalConfiguration();
      res.type("application/pdf");
      res.setHeader("Content-Disposition", "inline");
      return res.sendFile(kind === "terms" ? config.termsPath : config.privacyPath);
    } catch (error) { return next(error); }
  };
}
app.get("/terms", serveLegalDocument("terms"));
app.get("/privacy", serveLegalDocument("privacy"));
app.use("/api", router);

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof LegalConfigurationError) {
    return res.status(503).json({ error: error.message, code: "LEGAL_CONFIGURATION_MISSING" });
  }
  if (error instanceof BackupConfigurationError) {
    return res.status(503).json({ error: error.message, code: "BACKUP_CONFIGURATION_MISSING", missingVariables: error.missingVariables });
  }
  if (isValidationError(error)) {
    return res.status(400).json({
      error: "Invalid request.",
      code: "VALIDATION_ERROR",
      issues: error.issues,
    });
  }

  req.log.error({ err: error }, "Request failed");
  return res.status(500).json({
    error: "The request could not be completed.",
    code: "INTERNAL_ERROR",
  });
};

app.use(errorHandler);

export default app;
