import { revalidatePath } from "next/cache";
import {
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
  const bookActivity = await getBookActivity();

  const popularBooks = bookActivity
    .map((book) => ({
      ...book,
      popularityScore: book.borrowCount * 3 + book.heartsCount,
    }))
    .filter((book) => book.popularityScore > 0)
    .sort((a, b) => b.popularityScore - a.popularityScore);

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

export async function updateBorrowStatusService(
  requestId: string,
  status: "approved" | "rejected",
  librarianId: string,
) {
  const now = new Date();
  const existing = await getBorrowRequest(requestId);
  if (existing?.status !== "pending") throw new UserError(UNRESOLVABLE);

  if (status === "approved") {
    const dueDate = new Date(now.getTime() + LOAN_DAYS * 24 * 60 * 60 * 1000);
    const approved = await approvePendingBorrowRequest(requestId, existing.bookId, {
      librarianId,
      approvedDate: now,
      dueDate,
    });
    if (!approved)
      throw new UserError("El libro no está disponible o la solicitud ya fue resuelta.");
  } else if (
    !(await resolvePendingBorrowRequest(requestId, { status, librarianId, updatedAt: now }))
  ) {
    throw new UserError(UNRESOLVABLE);
  }

  revalidatePath("/");
}

export async function returnLoanService(requestId: string) {
  const loan = await getBorrowRequest(requestId);
  if (loan?.status !== "approved" || !(await returnApprovedLoan(requestId, loan.bookId))) {
    throw new UserError("El préstamo no existe o ya fue devuelto.");
  }

  revalidatePath("/");
}
