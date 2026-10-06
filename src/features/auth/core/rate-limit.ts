export class RefillingTokenBucket<_Key> {
  public max: number;
  public refillIntervalSeconds: number;
  private storage = new Map<_Key, RefillBucket>();

  constructor(max: number, refillIntervalSeconds: number) {
    this.max = max;
    this.refillIntervalSeconds = refillIntervalSeconds;
  }

  public check(key: _Key, cost: number): boolean {
    const bucket = this.storage.get(key) ?? null;
    if (bucket === null) return true;
    const now = Date.now();
    const refill = Math.floor((now - bucket.refilledAt) / (this.refillIntervalSeconds * 1000));
    if (refill > 0) return Math.min(bucket.count + refill, this.max) >= cost;
    return bucket.count >= cost;
  }

  public consume(key: _Key, cost: number): boolean {
    const bucket = this.storage.get(key) ?? null;
    const now = Date.now();
    if (bucket === null) {
      this.storage.set(key, { count: this.max - cost, refilledAt: now });
      return true;
    }
    const refill = Math.floor((now - bucket.refilledAt) / (this.refillIntervalSeconds * 1000));
    bucket.count = Math.min(bucket.count + refill, this.max);
    bucket.refilledAt = now;
    if (bucket.count < cost) return false;
    bucket.count -= cost;
    this.storage.set(key, bucket);
    return true;
  }
}

export class Throttler<_Key> {
  public timeoutSeconds: number[];
  private storage = new Map<_Key, ThrottlingCounter>();

  constructor(timeoutSeconds: number[]) {
    this.timeoutSeconds = timeoutSeconds;
  }

  public consume(key: _Key): boolean {
    const counter = this.storage.get(key) ?? null;
    const now = Date.now();
    if (counter === null) {
      this.storage.set(key, { timeout: 0, updatedAt: now });
      return true;
    }
    const allowed = now - counter.updatedAt >= this.timeoutSeconds[counter.timeout] * 1000;
    if (!allowed) return false;
    counter.updatedAt = now;
    counter.timeout = Math.min(counter.timeout + 1, this.timeoutSeconds.length - 1);
    this.storage.set(key, counter);
    return true;
  }

  public reset(key: _Key): void {
    this.storage.delete(key);
  }
}

export class ExpiringTokenBucket<_Key> {
  public max: number;
  public expiresInSeconds: number;
  private storage = new Map<_Key, ExpiringBucket>();

  constructor(max: number, expiresInSeconds: number) {
    this.max = max;
    this.expiresInSeconds = expiresInSeconds;
  }

  public check(key: _Key, cost: number): boolean {
    const bucket = this.storage.get(key) ?? null;
    if (bucket === null) return true;
    return this.currentCount(bucket, Date.now()) >= cost;
  }

  public consume(key: _Key, cost: number): boolean {
    const bucket = this.storage.get(key) ?? null;
    const now = Date.now();
    if (bucket === null) {
      this.storage.set(key, { count: this.max - cost, createdAt: now });
      return true;
    }
    if (this.isExpired(bucket, now)) {
      bucket.count = this.max;
      bucket.createdAt = now;
    }
    if (bucket.count < cost) return false;
    bucket.count -= cost;
    this.storage.set(key, bucket);
    return true;
  }

  public reset(key: _Key): void {
    this.storage.delete(key);
  }

  private isExpired(bucket: ExpiringBucket, now: number): boolean {
    return now - bucket.createdAt >= this.expiresInSeconds * 1000;
  }

  private currentCount(bucket: ExpiringBucket, now: number): number {
    return this.isExpired(bucket, now) ? this.max : bucket.count;
  }
}

interface RefillBucket {
  count: number;
  refilledAt: number;
}

interface ExpiringBucket {
  count: number;
  createdAt: number;
}

interface ThrottlingCounter {
  timeout: number;
  updatedAt: number;
}
