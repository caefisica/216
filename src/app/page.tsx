import { getSession, getVerifiedUserId, isVerifiedStaff } from "@/features/auth/protected-action";
import { getCategories } from "@/features/books/actions";
import { SearchSchema } from "@/features/books/schemas";
import { getBooksService } from "@/features/books/service";
import { listActiveLoans, listPendingBorrowRequests } from "@/features/admin/repository";
import { BookCatalog } from "@/features/books/components/book-catalog";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import type { BookDetailed } from "@/features/books/types";

export default async function HomePage() {
  const { user } = await getSession();

  const [initialBooks, initialCategories] = await Promise.all([
    getBooksService(SearchSchema.parse({}), await getVerifiedUserId()),
    getCategories(),
  ]);

  if (isVerifiedStaff(user)) {
    const [initialPendingRequests, initialActiveLoans] = await Promise.all([
      listPendingBorrowRequests(),
      listActiveLoans(),
    ]);

    return (
      <main className="container mx-auto px-6 py-12">
        <AdminDashboard
          initialBooks={initialBooks as BookDetailed[]}
          initialPendingRequests={initialPendingRequests}
          initialActiveLoans={initialActiveLoans}
        />
      </main>
    );
  }

  return (
    <main className="container mx-auto px-6 py-12">
      <BookCatalog
        initialBooks={initialBooks as BookDetailed[]}
        initialCategories={initialCategories}
      />
    </main>
  );
}
