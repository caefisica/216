import { Role } from "@/lib/db/schema";

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
