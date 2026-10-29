import { Router } from "express";
import { config } from "../config.js";
import type { StoreRepository } from "../db/repository.js";
import { seedInitialStore } from "../seed.js";
import { MessageIngestionService } from "../services/messageIngestion.js";
import type { IngestMessageInput } from "../types.js";

export function ingestRouter(repository: StoreRepository): Router {
  const router = Router();
  const ingestion = new MessageIngestionService(repository);

  router.use((req, res, next) => {
    const secret = req.header("x-ingest-secret");
    if (!config.ingestSecret) {
      res.status(503).json({
        error: "לא הוגדר מפתח קליטה. הוסיפו INGEST_SECRET לקובץ הסביבה.",
      });
      return;
    }
    if (secret !== config.ingestSecret) {
      res.status(401).json({ error: "מפתח קליטה שגוי" });
      return;
    }
    next();
  });

  router.post("/messages", async (req, res, next) => {
    try {
      const body = req.body as IngestMessageInput;
      if (!body?.senderName || !body?.body) {
        res.status(400).json({ error: "חסרים שם שולח או תוכן הודעה" });
        return;
      }
      const result = await ingestion.ingest({
        ...body,
        source: body.source ?? "manual",
      });
      res.status(result.duplicate ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/webhook", async (req, res, next) => {
    try {
      const result = await ingestion.ingestWebhook(req.body ?? {});
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/seed", async (_req, res, next) => {
    try {
      const data = await seedInitialStore();
      res.json({ ok: true, isDemoData: data.settings.isDemoData });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
