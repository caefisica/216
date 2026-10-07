import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { runSeeds } from "./seeds";
import { computeHashes, readStoredIntegrity, writeStoredIntegrity } from "./integrity";
import { planSync } from "./sync-plan";
import { spawnSync } from "node:child_process";

const IN_SYNC = "No changes detected";

function drizzlePush(): { output: string } {
  const result = spawnSync("bun", ["x", "drizzle-kit", "push"], {
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { output: result.stdout + result.stderr };
}

export async function sync() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle({ client: pool, schema });

  console.log("Checking database sync...");

  const { schemaHash, seedHash } = await computeHashes();
  const stored = await readStoredIntegrity(db);
  const plan = planSync(stored, { schemaHash, seedHash });

  if (!plan.pushSchema && !plan.seed) {
    console.log("Database is up to date (hash matches).");
    await pool.end();
    return;
  }

  try {
    if (plan.pushSchema) {
      console.log("Schema changed. Pushing it to the existing database...");
      const first = drizzlePush();
      // A zero exit status can mean that drizzle-kit declined to push. Run it again to confirm
      // that no schema changes remain. Without a terminal it never prompts, and it applies no
      // data-losing statement.
      const applied = first.output.includes(IN_SYNC) || drizzlePush().output.includes(IN_SYNC);
      if (!applied) {
        console.error(
          `${first.output}\nThe schema was not applied, so nothing was seeded or recorded.\n` +
            "If the change would lose data, back up what you need and drop the database, or revert the schema change.",
        );
        process.exitCode = 1;
        return;
      }
    }

    console.log("Seeding...");
    await runSeeds(db);

    await writeStoredIntegrity(db, { schemaHash, seedHash });

    console.log("Database synchronization complete!");
  } catch (error) {
    console.error("Database sync failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  sync();
}
