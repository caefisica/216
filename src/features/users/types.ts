import { user, borrowRequests } from "@/lib/db/schema";
import type { BookDetailed } from "../books/types";

export type User = typeof user.$inferSelect;
type BorrowRequestRow = typeof borrowRequests.$inferSelect;

export interface BorrowRequest extends BorrowRequestRow {
  book: BookDetailed | null;
  user?: User;
}
