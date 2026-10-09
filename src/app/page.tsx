import { getSession, getVerifiedUserId, isVerifiedStaff } from "@/features/auth/protected-action";
import { SearchSchema } from "@/features/books/schemas";
import { getBookByIdService, getBooksService, getFacetsService } from "@/features/books/service";
import { getLoanCounts } from "@/features/loans/repository";
import { BookCatalog } from "@/features/books/components/book-catalog";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { getLibraryCounts } from "@/features/readers/repository";
import { isErr } from "@/lib/result";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await getSession();
  const params = await searchParams;
  const parsed = SearchSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : {};
  const staff = isVerifiedStaff(user);
  const selectedBookId = typeof params.book === "string" ? params.book : undefined;

  const [initialPage, facets, counts, selectedBookResult] = await Promise.all([
    getBooksService(filters, await getVerifiedUserId(), staff),
    getFacetsService(),
    staff ? null : getLibraryCounts(),
    selectedBookId ? getBookByIdService(selectedBookId, await getVerifiedUserId()) : null,
  ]);

  const catalogue = (
    <BookCatalog
      initialPage={initialPage}
      initialFilters={filters}
      facets={facets}
      staff={staff}
      counts={counts}
      user={user?.emailVerified ? user : null}
      initialSelectedBook={
        selectedBookResult && !isErr(selectedBookResult) ? selectedBookResult.value : null
      }
    />
  );

  if (staff) {
    return (
      <main className="container mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <AdminDashboard
          catalogue={catalogue}
          facets={facets}
          loanCounts={await getLoanCounts(new Date())}
        />
      </main>
    );
  }

  return <main className="container mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">{catalogue}</main>;
}
