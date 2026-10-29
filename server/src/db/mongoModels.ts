import mongoose, { Schema } from "mongoose";

const timeWindowSchema = new Schema(
  { open: String, close: String },
  { _id: false },
);

export const StoreSettingsModel = mongoose.model(
  "StoreSettings",
  new Schema(
    {
      _key: { type: String, default: "store", unique: true },
      name: { type: String, default: "" },
      timezone: { type: String, default: "Asia/Jerusalem" },
      whatsappInviteUrl: String,
      logoUrl: String,
      tagline: String,
      isDemoData: { type: Boolean, default: false },
    },
    { timestamps: true },
  ),
);

export const RegularOpeningHoursModel = mongoose.model(
  "RegularOpeningHours",
  new Schema({
    weekday: { type: Number, required: true, unique: true },
    isOpen: { type: Boolean, default: false },
    windows: [timeWindowSchema],
  }),
);

export const DailyScheduleOverrideModel = mongoose.model(
  "DailyScheduleOverride",
  new Schema({
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    isClosed: { type: Boolean, default: false },
    windows: [timeWindowSchema],
    reason: String,
    sourceMessageId: String,
  }),
);

export const StoreEventModel = mongoose.model(
  "StoreEvent",
  new Schema({
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, required: true },
    importance: { type: String, default: "normal" },
    startDate: { type: String, required: true },
    endDate: String,
    weekdays: [Number],
    sourceMessageId: String,
    isGeneralNotice: { type: Boolean, default: false },
  }),
);

export const ArchivedMessageModel = mongoose.model(
  "ArchivedMessage",
  new Schema({
    source: { type: String, required: true },
    sourceMessageId: { type: String, required: true },
    senderName: { type: String, required: true },
    isFromStaff: { type: Boolean, default: false },
    body: { type: String, required: true },
    sentAt: { type: String, required: true },
    receivedAt: { type: String, required: true },
    publicationStatus: { type: String, default: "pending" },
    messageKind: { type: String, default: "general" },
    extracted: Schema.Types.Mixed,
  }),
);

ArchivedMessageModel.schema.index({ source: 1, sourceMessageId: 1 }, { unique: true });
