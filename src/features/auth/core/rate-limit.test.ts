import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { ExpiringTokenBucket, RefillingTokenBucket, Throttler } from "./rate-limit";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

// Only the clock is faked, so the statements still run on a real D1.
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await testDb.db.prepare("DELETE FROM rate_limit").run();
});

afterEach(() => {
  vi.useRealTimers();
});

const SECOND = 1000;
const TEN_MINUTES = 600 * SECOND;

async function attempts(count: number, attempt: () => Promise<boolean>) {
  const results: boolean[] = [];
  for (let i = 0; i < count; i++) results.push(await attempt());
  return results;
}

describe("ExpiringTokenBucket", () => {
  it("allows `max` attempts inside the window and refuses the next", async () => {
    const bucket = new ExpiringTokenBucket("t", 3, 600);
    expect(await attempts(4, () => bucket.consume("u"))).toEqual([true, true, true, false]);
  });

  it("keeps subjects and limiters apart", async () => {
    const bucket = new ExpiringTokenBucket("a", 1, 600);
    const other = new ExpiringTokenBucket("b", 1, 600);
    await bucket.consume("u");
    expect(await bucket.consume("u")).toBe(false);
    expect(await bucket.consume("v")).toBe(true);
    expect(await other.consume("u")).toBe(true);
  });

  it("opens a new window only once the old one has run its full length", async () => {
    const bucket = new ExpiringTokenBucket("t", 3, 600);
    await attempts(3, () => bucket.consume("u"));

    vi.advanceTimersByTime(TEN_MINUTES - 1);
    expect(await bucket.consume("u")).toBe(false);

    vi.advanceTimersByTime(1);
    expect(await attempts(4, () => bucket.consume("u"))).toEqual([true, true, true, false]);
  });

  it("does not stretch the window by refused attempts", async () => {
    const bucket = new ExpiringTokenBucket("t", 1, 600);
    await bucket.consume("u");
    vi.advanceTimersByTime(TEN_MINUTES / 2);
    await bucket.consume("u");
    vi.advanceTimersByTime(TEN_MINUTES / 2);
    expect(await bucket.consume("u")).toBe(true);
  });

  it("gives the full allowance back after reset", async () => {
    const bucket = new ExpiringTokenBucket("t", 1, 600);
    await bucket.consume("u");
    await bucket.reset("u");
    expect(await bucket.consume("u")).toBe(true);
  });

  it("lets only `max` of many simultaneous attempts through", async () => {
    const bucket = new ExpiringTokenBucket("t", 5, 600);
    const results = await Promise.all(Array.from({ length: 20 }, () => bucket.consume("u")));
    expect(results.filter(Boolean)).toHaveLength(5);
  });
});

describe("RefillingTokenBucket", () => {
  it("allows a burst of `max`, then refuses", async () => {
    const bucket = new RefillingTokenBucket("t", 3, 10);
    expect(await attempts(4, () => bucket.consume("ip"))).toEqual([true, true, true, false]);
  });

  it("gives back one token per interval", async () => {
    const bucket = new RefillingTokenBucket("t", 3, 10);
    await attempts(3, () => bucket.consume("ip"));

    vi.advanceTimersByTime(10 * SECOND - 1);
    expect(await bucket.consume("ip")).toBe(false);

    vi.advanceTimersByTime(1);
    expect(await attempts(2, () => bucket.consume("ip"))).toEqual([true, false]);
  });

  it("never holds more than `max` however long it idles", async () => {
    const bucket = new RefillingTokenBucket("t", 3, 10);
    await bucket.consume("ip");
    vi.advanceTimersByTime(1000 * SECOND);
    expect(await attempts(4, () => bucket.consume("ip"))).toEqual([true, true, true, false]);
  });

  it("lets only `max` of many simultaneous attempts through", async () => {
    const bucket = new RefillingTokenBucket("t", 4, 10);
    const results = await Promise.all(Array.from({ length: 20 }, () => bucket.consume("ip")));
    expect(results.filter(Boolean)).toHaveLength(4);
  });
});

describe("Throttler", () => {
  it("lengthens the wait after each attempt and holds at the last step", async () => {
    const throttler = new Throttler("t", [1, 2, 4]);
    expect(await throttler.consume("u")).toBe(true);

    // After attempt n the next one waits steps[n - 1] seconds.
    for (const wait of [1, 2, 4, 4]) {
      vi.advanceTimersByTime(wait * SECOND - 1);
      expect(await throttler.consume("u")).toBe(false);
      vi.advanceTimersByTime(1);
      expect(await throttler.consume("u")).toBe(true);
    }
  });

  it("remembers the step through the wait, and forgets it after a quiet day", async () => {
    const throttler = new Throttler("t", [1, 60]);
    await throttler.consume("u");
    vi.advanceTimersByTime(SECOND);
    await throttler.consume("u");

    vi.advanceTimersByTime(60 * SECOND);
    await throttler.consume("u");
    expect(await throttler.consume("u")).toBe(false);

    vi.advanceTimersByTime(24 * 60 * 60 * SECOND);
    expect(await throttler.consume("u")).toBe(true);
    vi.advanceTimersByTime(SECOND);
    expect(await throttler.consume("u")).toBe(true);
  });

  it("starts over after reset", async () => {
    const throttler = new Throttler("t", [60]);
    await throttler.consume("u");
    expect(await throttler.consume("u")).toBe(false);
    await throttler.reset("u");
    expect(await throttler.consume("u")).toBe(true);
  });
});

describe("expired rows", () => {
  it("are deleted by the next decision, and live rows are kept", async () => {
    const bucket = new ExpiringTokenBucket("t", 1, 600);
    await bucket.consume("old");
    vi.advanceTimersByTime(TEN_MINUTES);
    await bucket.consume("new");

    const rows = await testDb.query<{ key: string }>("SELECT key FROM rate_limit");
    expect(rows.map((row) => row.key)).toEqual(["t:new"]);
  });
});
