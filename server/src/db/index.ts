import { config } from "../config.js";
import { FileRepository } from "./fileRepository.js";
import { MongoRepository } from "./mongoRepository.js";
import type { StoreRepository } from "./repository.js";

let repository: StoreRepository | null = null;

export async function getRepository(): Promise<StoreRepository> {
  if (repository) return repository;

  if (config.mongoUri) {
    const mongo = new MongoRepository();
    try {
      await mongo.ready();
      repository = mongo;
      return repository;
    } catch (error) {
      console.warn("לא ניתן להתחבר ל-MongoDB, עוברים למסד קבצים מקומי.", error);
    }
  }

  repository = new FileRepository();
  await repository.ready();
  return repository;
}
