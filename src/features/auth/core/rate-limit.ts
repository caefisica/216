import { eq, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/db/schema";

/*
 * Limits are rows in the `rate_limit` D1 table, shared by every instance. Each decision is one
 * upsert with `RETURNING` (a row means allowed), and D1 runs statements one at a time, so
 * concurrent attempts cannot both take the last token. Instance clocks must agree to about 1 s.
 */

type Decision = {
  key: string;
  now: number;
  /** The row for a subject with no row yet. */
  first: { count: number; expiresAt: number };
  /** The new row when the subject has one. Expressions read the old row's columns. */
  next: { count: SQL; stampedAt: SQL | number; expiresAt: SQL | number };
  when: SQL;
};

/** Deletes rows that no longer affect any decision, then runs the one statement that decides. */
async function decide({ key, now, first, next, when }: Decision): Promise<boolean> {
  const db = await getDb();
  const [, allowed] = await db.batch([
    db.delete(rateLimit).where(lte(rateLimit.expiresAt, now)),
    db
      .insert(rateLimit)
      .values({ key, count: first.count, stampedAt: now, expiresAt: first.expiresAt })
      .onConflictDoUpdate({ target: rateLimit.key, set: next, setWhere: when })
      .returning({ count: rateLimit.count }),
  ]);
  return allowed.length > 0;
}

async function clear(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(rateLimit).where(eq(rateLimit.key, key));
}

/** Holds `max` tokens and gives one back every `refillIntervalSeconds`. */
export class RefillingTokenBucket {
  constructor(
    private readonly name: string,
    private readonly max: number,
    private readonly refillIntervalSeconds: number,
  ) {}

  consume(subject: string): Promise<boolean> {
    const now = Date.now();
    const interval = this.refillIntervalSeconds * 1000;
    const expiresAt = now + this.max * interval;
    const tokens = sql`min(${rateLimit.count} + cast((${now} - ${rateLimit.stampedAt}) / ${interval} as integer), ${this.max})`;
    return decide({
      key: `${this.name}:${subject}`,
      now,
      first: { count: this.max - 1, expiresAt },
      next: { count: sql`${tokens} - 1`, stampedAt: now, expiresAt },
      when: sql`${tokens} >= 1`,
    });
  }
}

/** Allows `max` attempts, then refuses until `expiresInSeconds` after the window opened. */
export class ExpiringTokenBucket {
  constructor(
    private readonly name: string,
    private readonly max: number,
    private readonly expiresInSeconds: number,
  ) {}

  consume(subject: string): Promise<boolean> {
    const now = Date.now();
    const window = this.expiresInSeconds * 1000;
    const expired = sql`(${now} - ${rateLimit.stampedAt} >= ${window})`;
    return decide({
      key: `${this.name}:${subject}`,
      now,
      first: { count: this.max - 1, expiresAt: now + window },
      next: {
        count: sql`CASE WHEN ${expired} THEN ${this.max - 1} ELSE ${rateLimit.count} - 1 END`,
        stampedAt: sql`CASE WHEN ${expired} THEN ${now} ELSE ${rateLimit.stampedAt} END`,
        expiresAt: sql`CASE WHEN ${expired} THEN ${now + window} ELSE ${rateLimit.expiresAt} END`,
      },
      when: sql`${expired} OR ${rateLimit.count} >= 1`,
    });
  }

  reset(subject: string): Promise<void> {
    return clear(`${this.name}:${subject}`);
  }
}

/** A throttled subject that stays quiet this long starts again from the first step. */
const THROTTLE_MEMORY_MS = 24 * 60 * 60 * 1000;

/**
 * Makes each allowed attempt lengthen the wait before the next one, following `timeoutSeconds`
 * and staying on the last step. The row's `count` is the index of the current step.
 */
export class Throttler {
  constructor(
    private readonly name: string,
    private readonly timeoutSeconds: readonly number[],
  ) {}

  consume(subject: string): Promise<boolean> {
    const now = Date.now();
    const timeouts = JSON.stringify(this.timeoutSeconds);
    const last = this.timeoutSeconds.length - 1;
    const expiresAt = now + THROTTLE_MEMORY_MS;
    return decide({
      key: `${this.name}:${subject}`,
      now,
      first: { count: 0, expiresAt },
      next: { count: sql`min(${rateLimit.count} + 1, ${last})`, stampedAt: now, expiresAt },
      when: sql`${now} - ${rateLimit.stampedAt} >= json_extract(${timeouts}, '$[' || ${rateLimit.count} || ']') * 1000`,
    });
  }

  reset(subject: string): Promise<void> {
    return clear(`${this.name}:${subject}`);
  }
}
