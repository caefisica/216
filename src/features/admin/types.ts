import { BookDetailed } from "../books/types";
import { BorrowRequest, User } from "../users/types";
import { Role } from "@/lib/db/schema";

export type PendingRequest = BorrowRequest & {
  book: BookDetailed;
  user: User;
};

export interface ActiveLoan {
  id: string;
  bookId: string;
  userId: string;
  approvedDate: Date | null;
  dueDate: Date | null;
  book: { title: string; author: string };
  user: { name: string; email: string };
}

export interface BookStats {
  id: string;
  title: string;
  author: string;
  borrowCount: number;
  heartsCount: number;
  popularityScore: number;
  status: string;
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
