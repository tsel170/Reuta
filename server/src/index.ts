import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAdminStore } from "./admin/store.js";
import { config, isProduction } from "./config.js";
import { AdminHttpError } from "./services/adminSchedule.js";
import { getRepository } from "./db/index.js";
import { adminRouter } from "./routes/admin.js";
import { adminAuthRouter } from "./routes/adminAuth.js";
import { ingestRouter } from "./routes/ingest.js";
import { publicRouter } from "./routes/public.js";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const repository = await getRepository();
  const adminStore = await getAdminStore();
  if (config.whatsappInviteUrl) {
    await repository.updateSettings({ whatsappInviteUrl: config.whatsappInviteUrl });
  }

  const app = express();
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "12mb" }));

  app.use("/api", publicRouter(repository));
  app.use("/api/ingest", ingestRouter(repository));
  app.use("/api/admin/auth", adminAuthRouter(adminStore));
  app.use("/api/admin", adminRouter(repository, adminStore));

  if (isProduction) {
    const clientDir = path.resolve(here, "../../client/dist");
    app.use(express.static(clientDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  app.use(
    (
      error: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status =
        error instanceof AdminHttpError
          ? error.status
          : ((error as { statusCode?: number }).statusCode ?? 500);
      if (status >= 500) console.error(error);
      res.status(status).json({
        error: status >= 500 ? "שגיאת שרת פנימית" : error.message,
      });
    },
  );

  app.listen(config.port, () => {
    console.log(`Server listening on http://127.0.0.1:${config.port} (${repository.kind})`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
