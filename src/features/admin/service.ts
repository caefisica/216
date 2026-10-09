import { getBookActivity, getActiveUsers, getMonthlyActivity } from "./repository";

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
