import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { getPlatformProxy, unstable_readConfig } from "wrangler";
import { drizzle } from "drizzle-orm/d1";
import { isNull } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import type { Database } from "../src/lib/db";
import { getFileUrl } from "../src/lib/storage";
import { addBookImageRecord } from "../src/features/books/repository";
import { remoteBucket, remoteDatabase, runCf, type ObjectBucket } from "./cloudflare-remote";

const USAGE = `Usage: bun run covers:fetch -- [--remote] [--dry-run]

Matches titles without a cover on Open Library and stores the covers in R2 and the database.
Without --remote it uses the local database and bucket. With --remote it uses production through
the cf CLI. With --dry-run it matches and prints what it would write, and writes nothing.`;

const DEFAULT_SEARCH_URL = "https://openlibrary.org/search.json";
const USER_AGENT = "216-library-covers/1.0 (https://github.com/caefisica/216)";
const REQUEST_GAP_MS = 250;
const CACHE_FILE = resolve(".cache/covers/open-library.json");
const MISS_FILE = resolve(".cache/covers/misses.json");

export interface CoverSearchResult {
  cover_i?: number;
  title?: string;
  author_name?: string[];
  isbn?: string[];
}

interface CacheEntry {
  status: "found" | "miss";
  result?: CoverSearchResult;
}

interface OpenLibraryResponse {
  docs?: CoverSearchResult[];
}

export function normalizeCoverText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function firstAuthor(author: string | null) {
  return author?.split(/[,;&]|\band\b/i)[0]?.trim() ?? "";
}

function titleSimilarity(left: string, right: string) {
  const a = normalizeCoverText(left);
  const b = normalizeCoverText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aWords = new Set(a.split(" "));
  const bWords = new Set(b.split(" "));
  const shared = [...aWords].filter((word) => bWords.has(word)).length;
  return shared / Math.max(aWords.size, bWords.size);
}

function authorMatches(expected: string, authors: string[] | undefined) {
  if (!expected) return true;
  if (!authors?.length) return false;
  const actual = normalizeCoverText(authors[0]);
  return normalizeCoverText(expected)
    .split(" ")
    .every((word) => actual.includes(word));
}

export function findCoverMatch(title: string, author: string | null, results: CoverSearchResult[]) {
  const expectedAuthor = firstAuthor(author);
  return results.find(
    (result) =>
      result.cover_i &&
      result.title &&
      titleSimilarity(title, result.title) >= 0.86 &&
      authorMatches(expectedAuthor, result.author_name),
  );
}

async function loadJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function saveJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function searchCover(
  title: string,
  author: string | null,
  fetcher: typeof fetch,
  searchUrl: string,
) {
  const url = new URL(searchUrl);
  url.searchParams.set("title", title);
  const first = firstAuthor(author);
  // Open Library answers an empty author parameter with a 500.
  if (first) url.searchParams.set("author", first);
  url.searchParams.set("fields", "cover_i,title,author_name,isbn");
  url.searchParams.set("limit", "10");
  const response = await fetcher(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Open Library respondió ${response.status}.`);
  const data = (await response.json()) as OpenLibraryResponse;
  return findCoverMatch(title, author, data.docs ?? []);
}

export interface CoverFetchOptions {
  books: Array<{ id: string; title: string; author: string | null; imageUrl: string | null }>;
  bucket: ObjectBucket;
  db: Database;
  fetcher?: typeof fetch;
  searchUrl?: string;
  cacheFile?: string;
  missFile?: string;
  dryRun?: boolean;
}

export async function fetchCovers({
  books,
  bucket,
  db,
  fetcher = fetch,
  searchUrl = process.env.OPEN_LIBRARY_SEARCH_URL ?? DEFAULT_SEARCH_URL,
  cacheFile = CACHE_FILE,
  missFile = MISS_FILE,
  dryRun = false,
}: CoverFetchOptions) {
  const cache = await loadJson<Record<string, CacheEntry>>(cacheFile, {});
  const misses = await loadJson<string[]>(missFile, []);
  const missSet = new Set(misses);
  let found = 0;
  let missed = 0;
  let errors = 0;
  let lastRequestAt = 0;
  const politeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const wait = REQUEST_GAP_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await fetcher(input, init);
    lastRequestAt = Date.now();
    return response;
  };

  for (const book of books.filter((item) => !item.imageUrl)) {
    const cacheKey = `${normalizeCoverText(book.title)}|${normalizeCoverText(
      firstAuthor(book.author),
    )}`;
    let entry = cache[cacheKey];
    if (!entry) {
      try {
        const result = await searchCover(book.title, book.author, politeFetch, searchUrl);
        entry = result ? { status: "found", result } : { status: "miss" };
      } catch (error) {
        console.error(`No se pudo consultar Open Library para «${book.title}»:`, error);
        errors++;
        continue;
      }
      cache[cacheKey] = entry;
      if (!dryRun) await saveJson(cacheFile, cache);
    }
    if (entry.status === "miss" || !entry.result?.cover_i) {
      missed++;
      missSet.add(`${book.title}${book.author ? ` — ${book.author}` : ""}`);
      continue;
    }
    const source = `https://covers.openlibrary.org/b/id/${entry.result.cover_i}-M.jpg`;
    let image: Response;
    try {
      image = await politeFetch(source, { headers: { "User-Agent": USER_AGENT } });
      if (!image.ok) throw new Error(`Open Library respondió ${image.status}.`);
    } catch (error) {
      console.error(`No se pudo descargar la portada de «${book.title}»:`, error);
      errors++;
      continue;
    }
    if (dryRun) {
      console.log(`Se guardaría la portada de «${book.title}» (${book.id}) desde ${source}.`);
    } else {
      const key = `book-images/${crypto.randomUUID()}.jpg`;
      const storedUrl = getFileUrl(key);
      try {
        await bucket.put(key, new Uint8Array(await image.arrayBuffer()), {
          httpMetadata: { contentType: "image/jpeg" },
        });
      } catch (error) {
        console.error(`No se pudo guardar la portada de «${book.title}»:`, error);
        errors++;
        continue;
      }
      try {
        const attached = await addBookImageRecord(
          { bookId: book.id, imageUrl: storedUrl, isCover: true, displayOrder: 0 },
          db,
        );
        if (!attached) {
          await bucket.delete(key);
          missed++;
          missSet.add(`${book.title}${book.author ? ` — ${book.author}` : ""}`);
          continue;
        }
      } catch (error) {
        await bucket.delete(key);
        throw error;
      }
    }
    found++;
  }
  if (!dryRun) await saveJson(missFile, [...missSet].sort());
  return { found, missed, errors, total: books.filter((book) => !book.imageUrl).length };
}

async function connect(remote: boolean) {
  if (!remote) {
    const proxy = await getPlatformProxy<CloudflareEnv>({ envFiles: [] });
    return {
      db: drizzle(proxy.env.DB, { schema }),
      bucket: proxy.env._216_storage,
      target: "local",
      close: () => proxy.dispose(),
    };
  }
  const config = unstable_readConfig({ config: "wrangler.jsonc" }) as {
    d1_databases: Array<{ binding: string; database_name?: string; database_id?: string }>;
    r2_buckets: Array<{ binding: string; bucket_name?: string }>;
  };
  const database = config.d1_databases.find((item) => item.binding === "DB");
  const bucket = config.r2_buckets.find((item) => item.binding === "_216_storage");
  if (!database?.database_id || !bucket?.bucket_name)
    throw new Error("wrangler.jsonc binds no DB database or _216_storage bucket.");
  return {
    db: remoteDatabase(runCf, database.database_id) as unknown as Database,
    bucket: remoteBucket(runCf, bucket.bucket_name),
    target: `producción (D1 ${database.database_name}, R2 ${bucket.bucket_name})`,
    close: async () => {},
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      remote: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) return console.log(USAGE);
  const { db, bucket, target, close } = await connect(values.remote);
  try {
    const books = await db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        author: schema.books.author,
        imageUrl: schema.books.imageUrl,
      })
      .from(schema.books)
      .where(isNull(schema.books.imageUrl));
    console.log(
      `Destino: ${target}${values["dry-run"] ? " (simulacro: no se escribe nada)" : ""}. ` +
        `Títulos sin portada: ${books.length}.`,
    );
    const result = await fetchCovers({ db, bucket, books, dryRun: values["dry-run"] });
    console.log(
      `Portadas encontradas: ${result.found}. Sin coincidencia: ${result.missed}. ` +
        `Errores: ${result.errors}. ` +
        `Pendientes: ${result.total - result.found}.`,
    );
    if (!values["dry-run"])
      console.log(
        `Las coincidencias se guardaron en ${CACHE_FILE}; las faltantes en ${MISS_FILE}.`,
      );
  } finally {
    await close();
  }
}

if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
