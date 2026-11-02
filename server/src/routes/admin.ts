import { Router } from "express";
import type { AdminStore } from "../admin/types.js";
import type { StoreRepository } from "../db/repository.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  AdminHttpError,
  createEvent,
  patchEvent,
  saveAdminDay,
} from "../services/adminSchedule.js";
import { MessageIngestionService } from "../services/messageIngestion.js";
import { getMonthSchedule, getSchedule } from "../services/scheduleService.js";
import { withStoreIdentity } from "../storeIdentity.js";

export function adminRouter(repository: StoreRepository, store: AdminStore): Router {
  const router = Router();
  router.use(requireAdmin(store));

  router.get("/schedule", async (_req, res, next) => {
    try {
      res.json(await getSchedule(repository));
    } catch (error) {
      next(error);
    }
  });

  router.get("/calendar", async (req, res, next) => {
    try {
      const now = new Date();
      const year = Number(req.query.year ?? now.getFullYear());
      const month = Number(req.query.month ?? now.getMonth() + 1);
      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        res.status(400).json({ error: "חודש או שנה אינם תקינים" });
        return;
      }
      res.json(await getMonthSchedule(repository, year, month));
    } catch (error) {
      next(error);
    }
  });

  router.put("/days/:date", async (req, res, next) => {
    try {
      const result = await saveAdminDay(repository, req.params.date, {
        hours: req.body?.hours,
        event: req.body?.event ?? null,
      });
      res.json({
        ok: true,
        ...result,
        schedule: await getSchedule(repository),
      });
    } catch (error) {
      next(adminError(error));
    }
  });

  router.post("/events", async (req, res, next) => {
    try {
      const event = await createEvent(repository, req.body ?? {});
      res.status(201).json({ event, schedule: await getSchedule(repository) });
    } catch (error) {
      next(adminError(error));
    }
  });

  router.patch("/events/:id", async (req, res, next) => {
    try {
      const event = await patchEvent(repository, req.params.id, req.body ?? {});
      res.json({ event, schedule: await getSchedule(repository) });
    } catch (error) {
      next(adminError(error));
    }
  });

  router.delete("/events/:id", async (req, res, next) => {
    try {
      await repository.removeEvent(req.params.id);
      res.json({ ok: true, schedule: await getSchedule(repository) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/messages", async (_req, res, next) => {
    try {
      const messages = await repository.getMessages();
      res.json({
        messages: messages.slice(-80).map(toAdminMessage),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/messages", async (req, res, next) => {
    try {
      const settings = withStoreIdentity(await repository.getSettings());
      const ingestion = new MessageIngestionService(repository);
      const result = await ingestion.ingest({
        source: "manual",
        senderName: String(req.body?.senderName ?? settings.name),
        body: String(req.body?.body ?? ""),
        photos: req.body?.photos,
        isFromStaff: true,
        publicationStatus: "approved",
        apply: false,
      });
      res.status(201).json({
        message: toAdminMessage(result.message),
        schedule: await getSchedule(repository),
      });
    } catch (error) {
      next(adminError(error));
    }
  });

  router.patch("/messages/:id", async (req, res, next) => {
    try {
      const ingestion = new MessageIngestionService(repository);
      const message = await ingestion.update(req.params.id, {
        body: String(req.body?.body ?? ""),
        photos: req.body?.photos,
      });
      res.json({
        message: toAdminMessage(message),
        schedule: await getSchedule(repository),
      });
    } catch (error) {
      next(adminError(error));
    }
  });

  router.post("/messages/:id/apply", async (req, res, next) => {
    try {
      const ingestion = new MessageIngestionService(repository);
      const message = await ingestion.applyReviewed(req.params.id, {
        hours: req.body?.hours ?? null,
        event: req.body?.event ?? null,
      });
      res.json({
        message: toAdminMessage(message),
        schedule: await getSchedule(repository),
      });
    } catch (error) {
      next(adminError(error));
    }
  });

  router.delete("/messages/:id", async (req, res, next) => {
    try {
      const ingestion = new MessageIngestionService(repository);
      await ingestion.remove(req.params.id);
      res.json({ ok: true, schedule: await getSchedule(repository) });
    } catch (error) {
      next(adminError(error));
    }
  });

  return router;
}

function toAdminMessage(message: {
  id: string;
  senderName: string;
  isFromStaff: boolean;
  body: string;
  photos?: string[];
  sentAt: string;
  editedAt?: string;
  source: string;
  messageKind: string;
  publicationStatus: string;
  extracted?: {
    applied: boolean;
    kind: string;
    dates: string[];
    isClosed?: boolean;
    windows?: { open: string; close: string }[];
    eventTitle?: string;
    notes: string[];
    blockedReason?: string;
    confidence: string;
  };
}) {
  return {
    id: message.id,
    senderName: message.senderName,
    isFromStaff: message.isFromStaff,
    body: message.body,
    photos: message.photos ?? [],
    sentAt: message.sentAt,
    editedAt: message.editedAt,
    source: message.source,
    messageKind: message.messageKind,
    publicationStatus: message.publicationStatus,
    extracted: message.extracted,
  };
}

function adminError(error: unknown): unknown {
  if (error instanceof AdminHttpError) {
    const wrapped = error as AdminHttpError & { statusCode?: number };
    wrapped.statusCode = error.status;
    return wrapped;
  }
  return error;
}
