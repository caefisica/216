import { describe, expect, it } from "vitest";
import { planSync } from "./sync-plan";

const current = { schemaHash: "s2", seedHash: "d2" };

describe("planSync", () => {
  it("does nothing when both hashes match", () => {
    expect(planSync({ schemaHash: "s2", seedHash: "d2" }, current)).toEqual({
      pushSchema: false,
      seed: false,
    });
  });

  it("pushes the schema and seeds a database that was never synced", () => {
    expect(planSync({ schemaHash: null, seedHash: null }, current)).toEqual({
      pushSchema: true,
      seed: true,
    });
  });

  it("migrates in place when the schema changed", () => {
    expect(planSync({ schemaHash: "s1", seedHash: "d2" }, current)).toEqual({
      pushSchema: true,
      seed: true,
    });
  });

  it("only reseeds when just the seeds changed", () => {
    expect(planSync({ schemaHash: "s2", seedHash: "d1" }, current)).toEqual({
      pushSchema: false,
      seed: true,
    });
  });
});
