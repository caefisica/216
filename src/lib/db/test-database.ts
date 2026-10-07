import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";

const MIGRATIONS_DIR = join(process.cwd(), "migrations");
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";
const CONTEXT = Symbol.for("__cloudflare-context__");

export interface TestDatabase {
  db: D1Database;
  query<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]>;
  drop(): Promise<void>;
}

/**
 * Starts a local D1 database in a temporary directory. It uses the same engine as `wrangler dev`,
 * applies every migration, and exposes the `DB` binding that `getDb()` reads.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const dir = mkdtempSync(join(tmpdir(), "216-test-db-"));
  const proxy = await getPlatformProxy<CloudflareEnv>({ envFiles: [], persist: { path: dir } });
  const { env } = proxy;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const statements = readFileSync(join(MIGRATIONS_DIR, file), "utf8")
      .split(STATEMENT_BREAKPOINT)
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) await env.DB.prepare(statement).run();
  }

  (globalThis as Record<symbol, unknown>)[CONTEXT] = { env, cf: proxy.cf, ctx: proxy.ctx };

  return {
    db: env.DB,
    async query(sql, ...params) {
      const { results } = await env.DB.prepare(sql)
        .bind(...params)
        .all();
      return results as never;
    },
    async drop() {
      delete (globalThis as Record<symbol, unknown>)[CONTEXT];
      await proxy.dispose();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
