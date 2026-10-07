import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { createAdmin } from "./admin";
import * as schema from "./schema";

const USAGE = `Usage: bun run admin:create -- --email <email> [--name <name>] [--remote]

Makes the account an admin. The password is read from stdin, or prompted for on a terminal.
An existing account is promoted. A new one needs --name and a password.
Without --remote it writes to the local database. With --remote it writes to production.`;

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      remote: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) return console.log(USAGE);
  if (!values.email) throw new Error(`--email is required.\n\n${USAGE}`);

  const password = await readPassword();
  const db = drizzle((sql, params) => execute(sql, params, values.remote), { schema });
  const outcome = await createAdmin(db, {
    email: values.email,
    name: values.name,
    password: password || undefined,
  });
  const where = values.remote ? "production" : "local";
  console.log(
    `${values.email} is ${outcome === "created" ? "now" : "promoted to"} an admin in the ${where} database.`,
  );
}

/**
 * Runs one statement on the `DB` binding of `wrangler.jsonc` through `wrangler d1 execute`, which
 * takes no bound parameters, so they are written into the statement as SQL literals.
 */
async function execute(sql: string, params: unknown[], remote: boolean) {
  const statement = sql.replace(/\?/g, () => literal(params.shift()));
  const result = spawnSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      "DB",
      remote ? "--remote" : "--local",
      "--json",
      "--command",
      statement,
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw new Error(`wrangler d1 execute failed:\n${result.stderr}${result.stdout}`);
  const [{ results }] = JSON.parse(result.stdout) as [{ results: Record<string, unknown>[] }];
  return { rows: results.map((row) => Object.values(row)) };
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  throw new Error(`Cannot write a ${typeof value} into a statement.`);
}

async function readPassword(): Promise<string> {
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks)
      .toString("utf8")
      .replace(/\r?\n$/, "");
  }
  const password = await prompt("Password (empty keeps the current one): ");
  if (password && password !== (await prompt("Repeat the password: "))) {
    throw new Error("The passwords differ.");
  }
  return password;
}

/** Reads one line from the terminal without echoing it. */
function prompt(label: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let line = "";
    process.stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003") process.exit(130);
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(line);
        }
        line = char === "\u007f" ? line.slice(0, -1) : line + char;
      }
    };
    stdin.on("data", onData);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
