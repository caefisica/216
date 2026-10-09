import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fetchCovers, findCoverMatch } from "../../../scripts/fetch-covers";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";

const servers: Server[] = [];
let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

describe("cover matching", () => {
  it("accepts a close title and the first author, but rejects a lookalike title", () => {
    expect(
      findCoverMatch("Mecánica cuántica", "Richard Feynman", [
        { cover_i: 12, title: "Mecanica cuantica", author_name: ["Richard Feynman"] },
        { cover_i: 13, title: "Mecánica clásica", author_name: ["Richard Feynman"] },
      ])?.cover_i,
    ).toBe(12);
  });
});

describe("the cover fetch entry point", () => {
  it("leaves the author out of the search when the book has none, as Open Library answers an empty author with a 500", async () => {
    const server = createServer((request, response) => {
      const params = new URL(request.url ?? "", "http://127.0.0.1").searchParams;
      if (params.get("author") === "") {
        response.statusCode = 500;
        response.end("upstream failure");
        return;
      }
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ docs: [{ cover_i: 7, title: "Untitled shelf book" }] }));
    }).listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("stub server did not start");
    const directory = await mkdtemp(join(tmpdir(), "216-covers-test-"));

    try {
      const result = await fetchCovers({
        books: [{ id: "anon", title: "Untitled shelf book", author: null, imageUrl: null }],
        db: null as never,
        bucket: {} as R2Bucket,
        fetcher: fetch,
        searchUrl: `http://127.0.0.1:${address.port}/search`,
        cacheFile: join(directory, "results.json"),
        missFile: join(directory, "misses.json"),
        dryRun: true,
      });
      expect(result.errors).toBe(0);
      expect(result.found).toBe(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("sends the project user agent, caches misses but not failures, and rejects results without author data", async () => {
    let searches = 0;
    let images = 0;
    const server = createServer((request, response) => {
      expect(request.headers["user-agent"]).toContain("216-library-covers");
      if (request.url?.startsWith("/search")) {
        searches++;
        if (request.url.toLowerCase().includes("failure")) {
          response.statusCode = 500;
          response.end("upstream failure");
          return;
        }
        const title = new URL(request.url, "http://127.0.0.1").searchParams.get("title");
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify(
            title === "Known title"
              ? { docs: [{ cover_i: 42, title: "Known title", author_name: ["Ana Author"] }] }
              : title === "No author data"
                ? { docs: [{ cover_i: 44, title: "No author data" }] }
                : { docs: [] },
          ),
        );
        return;
      }
      images++;
      response.setHeader("Content-Type", "image/jpeg");
      response.end("jpeg");
    }).listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("stub server did not start");
    const base = `http://127.0.0.1:${address.port}`;
    const directory = await mkdtemp(join(tmpdir(), "216-covers-test-"));
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const value = String(input);
      return fetch(
        new URL(value).hostname === "covers.openlibrary.org" ? `${base}/cover.jpg` : value,
        init,
      );
    }) as typeof fetch;

    try {
      const result = await fetchCovers({
        books: [
          { id: "known", title: "Known title", author: "Ana Author", imageUrl: null },
          { id: "missing", title: "Missing title", author: "No Author", imageUrl: null },
          { id: "failure", title: "Failure title", author: "No Author", imageUrl: null },
          {
            id: "no-author-data",
            title: "No author data",
            author: "Expected Author",
            imageUrl: null,
          },
        ],
        db: null as never,
        bucket: {} as R2Bucket,
        fetcher,
        searchUrl: `${base}/search`,
        cacheFile: join(directory, "results.json"),
        missFile: join(directory, "misses.json"),
        dryRun: true,
      });
      expect(result).toEqual({ found: 1, missed: 2, errors: 1, total: 4 });
      expect(JSON.parse(await readFile(join(directory, "misses.json"), "utf8"))).toEqual([
        "Missing title — No Author",
        "No author data — Expected Author",
      ]);

      const retry = await fetchCovers({
        books: [{ id: "failure", title: "Failure title", author: "No Author", imageUrl: null }],
        db: null as never,
        bucket: {} as R2Bucket,
        fetcher,
        searchUrl: `${base}/search`,
        cacheFile: join(directory, "results.json"),
        missFile: join(directory, "misses.json"),
        dryRun: true,
      });
      expect(retry).toEqual({ found: 0, missed: 0, errors: 1, total: 1 });
      expect(searches).toBe(5);
      expect(images).toBe(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("uploads a cover, records it, and cleans up failed writes", async () => {
    const server = createServer((request, response) => {
      if (request.url?.startsWith("/search")) {
        const title = new URL(request.url, "http://127.0.0.1").searchParams.get("title");
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({ docs: [{ cover_i: 42, title, author_name: ["Ana Author"] }] }),
        );
        return;
      }
      response.setHeader("Content-Type", "image/jpeg");
      response.end("jpeg");
    }).listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("stub server did not start");
    const base = `http://127.0.0.1:${address.port}`;
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const value = String(input);
      return fetch(
        new URL(value).hostname === "covers.openlibrary.org" ? `${base}/cover.jpg` : value,
        init,
      );
    }) as typeof fetch;
    const directory = await mkdtemp(join(tmpdir(), "216-covers-write-test-"));
    const storedBook = await insertBook({ title: "Stored title", author: "Ana Author" });
    const failedBook = await insertBook({ title: "Failed title", author: "Ana Author" });
    const db = drizzle(testDb.db, { schema });
    const memory = memoryBucket();
    const failedMemory = memoryBucket({ failPut: true });

    try {
      const result = await fetchCovers({
        books: [
          {
            id: storedBook.id,
            title: storedBook.title,
            author: storedBook.author,
            imageUrl: null,
          },
        ],
        db,
        bucket: memory.bucket,
        fetcher,
        searchUrl: `${base}/search`,
        cacheFile: join(directory, "stored-results.json"),
        missFile: join(directory, "stored-misses.json"),
      });
      expect(result).toEqual({ found: 1, missed: 0, errors: 0, total: 1 });
      expect(memory.put).toHaveBeenCalledTimes(1);
      expect(memory.objects.size).toBe(1);
      const stored = await testDb.query<{ image_url: string }>(
        "SELECT image_url FROM book_images WHERE book_id = ?",
        storedBook.id,
      );
      expect(stored).toHaveLength(1);
      expect(stored[0].image_url).toMatch(/^\/media\//);

      const failed = await fetchCovers({
        books: [
          {
            id: failedBook.id,
            title: failedBook.title,
            author: failedBook.author,
            imageUrl: null,
          },
        ],
        db,
        bucket: failedMemory.bucket,
        fetcher,
        searchUrl: `${base}/search`,
        cacheFile: join(directory, "failed-results.json"),
        missFile: join(directory, "failed-misses.json"),
      });
      expect(failed).toEqual({ found: 0, missed: 0, errors: 1, total: 1 });
      expect(JSON.parse(await readFile(join(directory, "failed-misses.json"), "utf8"))).toEqual([]);
      expect(
        await testDb.query("SELECT image_url FROM book_images WHERE book_id = ?", failedBook.id),
      ).toHaveLength(0);
      expect(failedMemory.delete).not.toHaveBeenCalled();
      expect(failedMemory.objects.size).toBe(0);

      const cleanupMemory = memoryBucket();
      await expect(
        fetchCovers({
          books: [
            {
              id: crypto.randomUUID(),
              title: "Missing record title",
              author: "Ana Author",
              imageUrl: null,
            },
          ],
          db,
          bucket: cleanupMemory.bucket,
          fetcher,
          searchUrl: `${base}/search`,
          cacheFile: join(directory, "cleanup-results.json"),
          missFile: join(directory, "cleanup-misses.json"),
        }),
      ).rejects.toThrow();
      expect(cleanupMemory.delete).toHaveBeenCalledTimes(1);
      expect(cleanupMemory.objects.size).toBe(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function memoryBucket(options: { failPut?: boolean } = {}) {
  const objects = new Map<string, unknown>();
  const put = vi.fn(async (key: string, body: unknown) => {
    if (options.failPut) throw new Error("R2 upload failed");
    objects.set(key, body);
  });
  const remove = vi.fn(async (key: string) => {
    objects.delete(key);
  });
  return {
    bucket: { put, delete: remove } as unknown as R2Bucket,
    put,
    delete: remove,
    objects,
  };
}
