import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";
import * as schema from "./schema";
import { runDemoSeed } from "./seeds/demo";

async function main() {
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>({ envFiles: [] });
  try {
    await runDemoSeed(drizzle(env.DB, { schema }), process.env.SEED_PASSWORD ?? "password123");
    console.log("Demo accounts and books are in the local database.");
  } finally {
    await dispose();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
