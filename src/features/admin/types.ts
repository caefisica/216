import type { BookSummary, CopyView } from "../books/types";
import { BorrowRequest, User } from "../users/types";
import { Role } from "@/lib/db/schema";

export type PendingRequest = Omit<BorrowRequest, "book" | "copy" | "user"> & {
  book: BookSummary;
  user: User;
  /** The copies of the title that can be lent now, lowest number first. */
  lendableCopies: CopyView[];
};

export interface ActiveLoan {
  id: string;
  bookId: string;
  userId: string;
  approvedDate: Date | null;
  dueDate: Date | null;
  book: { code: string; title: string; author: string | null };
  copy: { id: string; code: string; volume: string | null };
  user: { name: string; email: string };
}

export interface BookStats {
  id: string;
  code: string;
  title: string;
  author: string | null;
  borrowCount: number;
  heartsCount: number;
  popularityScore: number;
}

export interface UserStats {
  id: string;
  name: string;
  email: string;
  borrowCount: number;
  role: Role;
}

export interface MonthlyStats {
  month: string;
  borrows: number;
  returns: number;
}
