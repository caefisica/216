import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const run = promisify(execFile);
const OXLINT = join(process.cwd(), "node_modules", ".bin", "oxlint");

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "216-design-tokens-"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** Lints `source` with the project config and returns the messages of the design token rule. */
async function lint(source: string) {
  const file = join(dir, "fixture.tsx");
  await writeFile(file, source);
  const { stdout } = await run(
    OXLINT,
    ["-c", join(process.cwd(), "oxlint.config.ts"), "--format", "json", file],
    { maxBuffer: 8 * 1024 * 1024 },
  ).catch((error) => error as { stdout: string });
  const { diagnostics } = JSON.parse(stdout) as {
    diagnostics: { code: string; message: string }[];
  };
  return diagnostics
    .filter((diagnostic) => diagnostic.code === "design-tokens(no-raw-values)")
    .map((diagnostic) => diagnostic.message);
}

describe("the design token lint rule", () => {
  it.each([
    ['<div className="bg-[#fff]" />', "a colour literal"],
    ['<div style={{ color: "rgb(0 0 0 / 0.1)" }} />', "a colour literal"],
    ['<div className="font-[Inter]" />', "a font family"],
    ["<div style={{ fontFamily: stack }} />", "a font family"],
    ['<div className="shadow-[0_1px_2px_black]" />', "a shadow"],
    ["<div className={`text-[1.125rem] ${x}`} />", "an arbitrary size, type, radius or curve"],
    ['<div className="md:w-[calc(100%-2rem)]" />', "an arbitrary size, type, radius or curve"],
    ['<div className="top-[13px]" />', "an arbitrary pixel value"],
  ])("refuses %s", async (source, kind) => {
    const messages = await lint(`export const x = ${source};`);
    expect(messages.some((message) => message.startsWith(kind))).toBe(true);
  });

  it.each([
    '<div className="mt-2 w-[var(--sidebar)] text-sm text-muted-foreground" />',
    '<div className="grid grid-cols-[3.5rem_minmax(0,1fr)] aspect-cover" />',
    '<div className="grid-cols-[120px_1fr] sm:grid-rows-[auto_1fr]" />',
    '<a href="#contenido">Saltar</a>',
  ])("allows %s", async (source) => {
    expect(await lint(`export const x = ${source};`)).toEqual([]);
  });
});
