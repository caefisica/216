import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

export interface TestDatabase {
  url: string;
  client: Client;
  sync(): { status: number | null; output: string };
  drop(): Promise<void>;
}

/**
 * Creates an empty database on the server named by TEST_DATABASE_URL, for example
 * postgres://postgres:pw@localhost:5432/postgres. Fails instead of skipping when it is unset,
 * so a missing server can never turn the database tests into silent passes.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = process.env.TEST_DATABASE_URL;
  if (!adminUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Run `mise run test-db` and use `mise run check`, or point it at a Postgres server that can create databases.",
    );
  }

  const name = `test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  return {
    url: url.toString(),
    client,
    sync() {
      const result = spawnSync("bun", ["src/lib/db/sync.ts"], {
        env: { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: "development" },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { status: result.status, output: result.stdout + result.stderr };
    },
    async drop() {
      await client.end();
      await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}
