import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "../src/lib/db/schema";

const execFileAsync = promisify(execFile);

/** Runs `cf <args>` and parses its JSON output. Returns null when the command prints nothing. */
export type CfRunner = (args: string[]) => Promise<unknown>;

export const runCf: CfRunner = async (args) => {
  try {
    const { stdout } = await execFileAsync("cf", args, { maxBuffer: 64 * 1024 * 1024 });
    return stdout.trim() ? JSON.parse(stdout) : null;
  } catch (error) {
    const { stderr = "", code } = error as { stderr?: string; code?: string | number };
    if (code === "ENOENT") throw new Error("The cf CLI is not installed. See docs/deployment.md.");
    throw new Error(`cf ${args.slice(0, 3).join(" ")} failed:\n${stderr.trim()}`);
  }
};

interface RawResult {
  results: { rows: unknown[][] };
}

/**
 * Runs Drizzle queries over the D1 REST API through `cf d1 raw`. D1 binds the parameters.
 * D1 runs a batch in one transaction, as it does for the `DB` binding.
 */
export function remoteDatabase(run: CfRunner, databaseId: string) {
  const query = (body: object) =>
    run(["d1", "raw", databaseId, "--body", JSON.stringify(body)]) as Promise<RawResult[]>;
  return drizzle(
    async (sql, params, method) => {
      const [{ results }] = await query({ sql, params });
      return { rows: method === "get" ? results.rows[0] : results.rows };
    },
    async (queries) => {
      const batch = queries.map(({ sql, params }) => ({ sql, params }));
      const results = await query({ batch });
      return results.map(({ results }, index) => ({
        rows: queries[index].method === "get" ? results.rows[0] : results.rows,
      }));
    },
    { schema },
  );
}

export interface ObjectBucket {
  put(
    key: string,
    body: Uint8Array,
    options: { httpMetadata: { contentType: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

/**
 * Lists the first uploaded key because `cf` percent-encodes slashes in object keys.
 */
export function remoteBucket(run: CfRunner, bucketName: string): ObjectBucket {
  let verified = false;
  return {
    async put(key, body, { httpMetadata }) {
      const directory = await mkdtemp(join(tmpdir(), "216-cover-"));
      try {
        const file = join(directory, "object");
        await writeFile(file, body);
        await run([
          "r2",
          "objects",
          "put",
          key,
          "--bucket-name",
          bucketName,
          "--content-type",
          httpMetadata.contentType,
          "--file",
          file,
        ]);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
      if (verified) return;
      const listing = (await run([
        "r2",
        "objects",
        "list",
        "--bucket-name",
        bucketName,
        "--prefix",
        key,
      ])) as Array<{ key: string }> | null;
      if (!listing?.some((object) => object.key === key))
        throw new Error(`R2 did not store the upload under the key ${key}.`);
      verified = true;
    },
    async delete(key) {
      await run(["r2", "objects", "delete", key, "--bucket-name", bucketName]);
    },
  };
}
