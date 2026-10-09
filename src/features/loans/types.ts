export interface LendableCopy {
  id: string;
  number: number;
  code: string;
  volume: string | null;
  location: { cabinet: string; shelf: number; bay: number } | null;
}

export interface PendingRequestRow {
  id: string;
  requestDate: Date;
  note: string | null;
  book: { id: string; code: string; title: string; author: string | null };
  reader: { name: string; email: string };
  /** Copies of the title that can be lent now, lowest number first. */
  lendableCopies: LendableCopy[];
}

export interface ActiveLoanRow {
  id: string;
  approvedDate: Date | null;
  dueDate: Date | null;
  book: { id: string; code: string; title: string; author: string | null };
  copy: { code: string; volume: string | null };
  reader: { name: string; email: string };
}

export interface LoanCounts {
  pending: number;
  active: number;
  overdue: number;
}

export type DeskPage =
  | { view: "requests"; items: PendingRequestRow[] }
  | { view: "loans"; items: ActiveLoanRow[] };

export type Desk = DeskPage & {
  counts: LoanCounts;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  now: Date;
  query: string;
};
