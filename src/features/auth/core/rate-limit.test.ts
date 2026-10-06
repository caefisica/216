import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpiringTokenBucket } from "./rate-limit";

const TEN_MINUTES_MS = 10 * 60 * 1000;

describe("ExpiringTokenBucket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows `max` consumptions inside the window and rejects the next", () => {
    const bucket = new ExpiringTokenBucket<string>(3, 600);
    expect([1, 2, 3, 4].map(() => bucket.consume("u", 1))).toEqual([true, true, true, false]);
  });

  it("refills once after expiry, then enforces the limit again", () => {
    const bucket = new ExpiringTokenBucket<string>(3, 600);
    for (let i = 0; i < 3; i++) bucket.consume("u", 1);

    vi.advanceTimersByTime(TEN_MINUTES_MS);

    expect([1, 2, 3, 4, 5].map(() => bucket.consume("u", 1))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("starts a new window at the refill, not at the first ever call", () => {
    const bucket = new ExpiringTokenBucket<string>(3, 600);
    bucket.consume("u", 1);

    vi.advanceTimersByTime(TEN_MINUTES_MS);
    bucket.consume("u", 3);

    vi.advanceTimersByTime(TEN_MINUTES_MS - 1);
    expect(bucket.consume("u", 1)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(bucket.consume("u", 1)).toBe(true);
  });

  it("check agrees with consume before and after expiry", () => {
    const bucket = new ExpiringTokenBucket<string>(3, 600);
    for (let i = 0; i < 3; i++) bucket.consume("u", 1);
    expect(bucket.check("u", 1)).toBe(false);

    vi.advanceTimersByTime(TEN_MINUTES_MS);
    expect(bucket.check("u", 1)).toBe(true);
    expect(bucket.check("u", 3)).toBe(true);
    expect(bucket.check("u", 4)).toBe(false);
    expect(bucket.consume("u", 4)).toBe(false);

    bucket.consume("u", 3);
    expect(bucket.check("u", 1)).toBe(false);
  });

  it("reset forgets the key", () => {
    const bucket = new ExpiringTokenBucket<string>(1, 600);
    bucket.consume("u", 1);
    bucket.reset("u");
    expect(bucket.consume("u", 1)).toBe(true);
  });
});
