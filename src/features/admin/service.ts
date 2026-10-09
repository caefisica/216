import { revalidatePath } from "next/cache";
import { firstLendableCopyId, listLendableCopiesForPending } from "@/features/books/repository";
import {
  listPendingBorrowRequests,
  getBookActivity,
  getActiveUsers,
  getMonthlyActivity,
  getBorrowRequest,
  resolvePendingBorrowRequest,
  approvePendingBorrowRequest,
  returnApprovedLoan,
} from "./repository";
import { UserError } from "@/lib/action";

const LOAN_DAYS = 14;
const UNRESOLVABLE = "La solicitud no existe o ya fue resuelta.";

export async function getDetailedAdminStatsService() {
  const popularBooks = await getBookActivity();

  const activeUsers = await getActiveUsers();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const monthlyActivity = await getMonthlyActivity(sixMonthsAgo);
  const monthlyData = monthlyActivity.map((m) => {
    const d = new Date(m.month + "-01");
    return {
      month: d.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      borrows: Number(m.borrows),
      returns: Number(m.returns),
    };
  });

  return {
    popularBooks,
    activeUsers: activeUsers.filter((u) => u.borrowCount > 0),
    monthlyData,
    overallStats: {
      totalBorrows: popularBooks.reduce((sum, b) => sum + b.borrowCount, 0),
      totalReturns: monthlyData.reduce((sum, m) => sum + m.returns, 0),
      bookUtilizationRate:
        popularBooks.length > 0
          ? Math.round(
              (popularBooks.reduce((sum, b) => sum + b.borrowCount, 0) / popularBooks.length) * 10,
            ) / 10
          : 0,
      mostActiveMonth:
        monthlyData.length > 0
          ? monthlyData.reduce((max, m) => (m.borrows > max.borrows ? m : max)).month
          : "N/A",
    },
  };
}

/** Returns pending requests with the copies of each title that can be lent now. */
export async function getPendingRequestsService() {
  const [requests, lendable] = await Promise.all([
    listPendingBorrowRequests(),
    listLendableCopiesForPending(),
  ]);
  return requests.map((request) => ({
    ...request,
    lendableCopies: lendable.filter((copy) => copy.bookId === request.bookId),
  }));
}

/**
 * Approving assigns a copy: the one the librarian chose, or the lowest-numbered lendable copy.
 */
export async function updateBorrowStatusService(
  requestId: string,
  status: "approved" | "rejected",
  librarianId: string,
  copyId?: string,
) {
  const now = new Date();
  const existing = await getBorrowRequest(requestId);
  if (existing?.status !== "pending") throw new UserError(UNRESOLVABLE);

  if (status === "approved") {
    const chosen = copyId ?? (await firstLendableCopyId(existing.bookId));
    if (!chosen) throw new UserError("Ningún ejemplar de este libro está disponible.");

    const dueDate = new Date(now.getTime() + LOAN_DAYS * 24 * 60 * 60 * 1000);
    const approved = await approvePendingBorrowRequest(requestId, chosen, {
      librarianId,
      approvedDate: now,
      dueDate,
    });
    if (!approved) {
      throw new UserError("El ejemplar no está disponible o la solicitud ya fue resuelta.");
    }
  } else if (
    !(await resolvePendingBorrowRequest(requestId, { status, librarianId, updatedAt: now }))
  ) {
    throw new UserError(UNRESOLVABLE);
  }

  revalidatePath("/");
}

export async function returnLoanService(requestId: string) {
  const loan = await getBorrowRequest(requestId);
  if (loan?.status !== "approved" || !(await returnApprovedLoan(requestId))) {
    throw new UserError("El préstamo no existe o ya fue devuelto.");
  }

  revalidatePath("/");
}
