import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, isProduction } from "./config.js";
import { getRepository } from "./db/index.js";
import { ingestRouter } from "./routes/ingest.js";
import { publicRouter } from "./routes/public.js";
import { seedInitialStore } from "./seed.js";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const repository = await getRepository();
  await seedInitialStore();
  if (config.whatsappInviteUrl) {
    await repository.updateSettings({ whatsappInviteUrl: config.whatsappInviteUrl });
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", publicRouter(repository));
  app.use("/api/ingest", ingestRouter(repository));

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
      console.error(error);
      res.status(500).json({ error: "שגיאת שרת פנימית" });
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
