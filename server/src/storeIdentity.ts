import type { StoreSettings } from "./types.js";

export const STORE_NAME = "רעותה";
export const STORE_TAGLINE = "בגדים באהבה";
export const STORE_LOGO_URL = "/reuota-poster.jpg";

export function withStoreIdentity(settings: StoreSettings): StoreSettings {
  return {
    ...settings,
    name: settings.name.trim() || STORE_NAME,
    tagline: settings.tagline?.trim() || STORE_TAGLINE,
    logoUrl: settings.logoUrl?.trim() || STORE_LOGO_URL,
  };
}
