import { getDb } from "@/lib/db";
import { books, copies } from "@/lib/db/schema";
import { copyIsLendable } from "@/features/books/sql";
import { sql } from "drizzle-orm";
import type { LibraryCounts } from "./types";

export async function getLibraryCounts(): Promise<LibraryCounts> {
  const db = await getDb();
  const [row] = await db.all<{
    titleCount: number;
    copyCount: number;
    availableNow: number;
  }>(sql`
    SELECT
      (SELECT count(*) FROM ${books}) AS "titleCount",
      (SELECT count(*) FROM ${copies}) AS "copyCount",
      (
        SELECT count(*)
        FROM ${copies}
        WHERE ${copyIsLendable}
      ) AS "availableNow"
  `);

  return {
    titleCount: Number(row?.titleCount ?? 0),
    copyCount: Number(row?.copyCount ?? 0),
    availableNow: Number(row?.availableNow ?? 0),
  };
}
