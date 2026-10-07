import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const GENERATED = "worker-configuration.d.ts";

// `bun run lint` regenerates this file, and its content depends on whether `.open-next` is built,
// so it must be a build output that git ignores.
it("ignores the generated Worker types in git", () => {
  const ignored = spawnSync("git", ["check-ignore", "--no-index", "--quiet", GENERATED]);
  expect(ignored.status).toBe(0);
});

it("generates the Worker types on install and before every lint", () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  expect(scripts.typegen).toContain("wrangler types");
  expect(scripts.postinstall).toContain("typegen");
  expect(scripts.lint).toContain("typegen");
});
