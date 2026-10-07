import { describe, expect, it } from "vitest";
import { hashPassword, ITERATIONS, verifyPasswordHash } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse");

    expect(await verifyPasswordHash(hash, "correct horse")).toBe(true);
    expect(await verifyPasswordHash(hash, "wrong horse")).toBe(false);
  });

  it("salts each hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("stays within the iteration limit of the Workers runtime", async () => {
    const [, , iterations] = (await hashPassword("x")).split("$");

    expect(Number(iterations)).toBe(ITERATIONS);
    expect(ITERATIONS).toBeLessThanOrEqual(100_000);
  });
});
