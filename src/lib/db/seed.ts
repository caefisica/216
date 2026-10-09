import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";
import type { Database } from "./index";
import * as schema from "./schema";
import { runCatalogueSeed } from "./seeds/catalogue";
import { runDemoSeed } from "./seeds/demo";

/** Everything `bun run db:seed` writes: the demo accounts and the librarians' catalogue. */
export async function runSeed(db: Database, password: string) {
  await runDemoSeed(db, password);
  await runCatalogueSeed(db);
}

async function main() {
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>({ envFiles: [] });
  try {
    await runSeed(drizzle(env.DB, { schema }), process.env.SEED_PASSWORD ?? "password123");
    console.log("Demo accounts and the catalogue are in the local database.");
  } finally {
    await dispose();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
