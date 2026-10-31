import { config } from "../config.js";
import { FileAdminStore } from "./fileStore.js";
import { MongoAdminStore } from "./mongoStore.js";
import type { AdminStore } from "./types.js";

let store: AdminStore | null = null;

export async function getAdminStore(): Promise<AdminStore> {
  if (store) return store;

  if (config.mongoUri) {
    try {
      const mongo = new MongoAdminStore();
      await mongo.ready();
      store = mongo;
    } catch (error) {
      console.warn("לא ניתן להתחבר ל-MongoDB עבור מנהלים, עוברים לקובץ מקומי.", error);
      store = new FileAdminStore();
      await store.ready();
    }
  } else {
    store = new FileAdminStore();
    await store.ready();
  }

  await store.bootstrapEmails(config.adminEmails);
  await store.deleteExpired();
  return store;
}
