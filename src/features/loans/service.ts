import { revalidatePath } from "next/cache";
import { UserError } from "@/lib/action";
import {
  approvePendingRequest,
  getBorrowRequestStatus,
  getLoanCounts,
  listActiveLoans,
  countLoanView,
  listPendingRequests,
  rejectPendingRequest,
  reopenReturnedLoan,
  returnApprovedLoan,
} from "./repository";
import { DESK_PAGE_SIZE, type DeskView } from "./schemas";
import type { Desk } from "./types";

const LOAN_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function revalidateLoanViews() {
  revalidatePath("/");
  revalidatePath("/admin/loans");
}

export const getDeskCounts = (now = new Date()) => getLoanCounts(now);

/**
 * Returns one page of a view plus the counts of every view. A page past the end clamps to the
 * last page, so a decision that empties a page does not leave a blank screen. Without a view it
 * opens the requests when any are waiting and the loans otherwise.
 */
export async function getDeskService(
  requestedView: DeskView | undefined,
  requestedPage: number,
  now = new Date(),
  query = "",
) {
  const counts = await getLoanCounts(now);
  const view = requestedView ?? (counts.pending > 0 ? "requests" : "loans");
  const normalizedQuery = query.trim();
  let total: number;
  if (normalizedQuery) {
    total = await countLoanView(view, normalizedQuery);
  } else {
    total = view === "requests" ? counts.pending : counts.active;
  }
  const pageCount = Math.max(1, Math.ceil(total / DESK_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const window = { limit: DESK_PAGE_SIZE, offset: (page - 1) * DESK_PAGE_SIZE };

  const shared = {
    counts,
    page,
    pageCount,
    total,
    pageSize: DESK_PAGE_SIZE,
    now,
    query: normalizedQuery,
  };
  return view === "requests"
    ? ({
        ...shared,
        view,
        items: await listPendingRequests(window, normalizedQuery),
      } satisfies Desk)
    : ({
        ...shared,
        view,
        items: await listActiveLoans(window, normalizedQuery),
      } satisfies Desk);
}

/** The librarian picks the copy. A copy that left the shelf or went to another reader is refused. */
export async function approveRequestService(
  requestId: string,
  copyId: string,
  librarianId: string,
  now = new Date(),
) {
  const approved = await approvePendingRequest(requestId, copyId, {
    librarianId,
    approvedDate: now,
    dueDate: new Date(now.getTime() + LOAN_DAYS * DAY_MS),
  });
  if (!approved) {
    // The update changed nothing. Read the request only to choose the error.
    const status = await getBorrowRequestStatus(requestId);
    if (status === undefined) throw new UserError("La solicitud no existe.");
    if (status !== "pending") throw new UserError("La solicitud ya fue resuelta.");
    throw new UserError("Ese ejemplar ya no está disponible. Elige otro.");
  }

  revalidateLoanViews();
}

export async function rejectRequestService(requestId: string, reason: string, librarianId: string) {
  if (
    !(await rejectPendingRequest(requestId, {
      librarianId,
      reason,
      decidedAt: new Date(),
    }))
  ) {
    const status = await getBorrowRequestStatus(requestId);
    throw new UserError(
      status === undefined ? "La solicitud no existe." : "La solicitud ya fue resuelta.",
    );
  }

  revalidateLoanViews();
}

export async function returnLoanService(requestId: string) {
  if (!(await returnApprovedLoan(requestId))) {
    const status = await getBorrowRequestStatus(requestId);
    throw new UserError(
      status === undefined
        ? "El préstamo no existe."
        : "El préstamo ya fue devuelto o no estaba vigente.",
    );
  }

  revalidateLoanViews();
}

/** Undoes a return. It is refused when the copy has since gone to another reader. */
export async function reopenLoanService(requestId: string) {
  if (!(await reopenReturnedLoan(requestId))) {
    const status = await getBorrowRequestStatus(requestId);
    if (status === undefined) throw new UserError("El préstamo no existe.");
    if (status !== "returned") throw new UserError("El préstamo no estaba devuelto.");
    throw new UserError("No se pudo deshacer: el ejemplar ya salió con otro lector.");
  }

  revalidateLoanViews();
}
