import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

/** The D1 database bound as `DB`. In `next dev` it is a local copy under `.wrangler/state`. */
export async function getDb(): Promise<Database> {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}
