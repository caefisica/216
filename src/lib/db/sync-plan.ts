export interface Hashes {
  schemaHash: string;
  seedHash: string;
}

export type StoredHashes = { [K in keyof Hashes]: Hashes[K] | null };

export interface SyncPlan {
  pushSchema: boolean;
  seed: boolean;
}

export function planSync(stored: StoredHashes, current: Hashes): SyncPlan {
  const pushSchema = stored.schemaHash !== current.schemaHash;
  const seed = pushSchema || stored.seedHash !== current.seedHash;
  return { pushSchema, seed };
}
