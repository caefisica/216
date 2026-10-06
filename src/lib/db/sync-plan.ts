export interface Hashes {
  schemaHash: string;
  seedHash: string;
}

export type StoredHashes = { [K in keyof Hashes]: Hashes[K] | null };

export interface SyncPlan {
  pushSchema: boolean;
  seed: boolean;
}

/** Decides what a sync must do: push the schema when its hash changed, and seed after any change. */
export function planSync(stored: StoredHashes, current: Hashes): SyncPlan {
  const pushSchema = stored.schemaHash !== current.schemaHash;
  const seed = pushSchema || stored.seedHash !== current.seedHash;
  return { pushSchema, seed };
}
