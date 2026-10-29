import { Router } from "express";
import { config } from "../config.js";
import { MessageIngestionService } from "../services/messageIngestion.js";
import { getSchedule } from "../services/scheduleService.js";
import type { StoreRepository } from "../db/repository.js";

function resolveWhatsAppUrl(stored?: string): string | null {
  const url = config.whatsappInviteUrl || stored;
  return MessageIngestionService.validateInviteUrl(url) ? url! : null;
}

export function publicRouter(repository: StoreRepository): Router {
  const router = Router();

  router.get("/health", async (_req, res) => {
    res.json({
      ok: true,
      storage: repository.kind,
    });
  });

  router.get("/store", async (_req, res, next) => {
    try {
      const settings = await repository.getSettings();
      res.json({
        ...settings,
        whatsappInviteUrl: resolveWhatsAppUrl(settings.whatsappInviteUrl) ?? undefined,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/schedule", async (_req, res, next) => {
    try {
      res.json(await getSchedule(repository));
    } catch (error) {
      next(error);
    }
  });

  router.get("/messages", async (_req, res, next) => {
    try {
      const settings = await repository.getSettings();
      const messages = await repository.getMessages({ publicationStatus: "approved" });
      res.json({
        isDemoData: settings.isDemoData,
        isLiveWhatsApp: false,
        whatsappInviteUrl: resolveWhatsAppUrl(settings.whatsappInviteUrl),
        messages: messages.map((message) => ({
          id: message.id,
          senderName: message.senderName,
          isFromStaff: message.isFromStaff,
          body: message.body,
          sentAt: message.sentAt,
          source: message.source,
          messageKind: message.messageKind,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
