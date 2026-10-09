import { getSession, getVerifiedUserId, isVerifiedStaff } from "@/features/auth/protected-action";
import { SearchSchema } from "@/features/books/schemas";
import { getBooksService, getFacetsService } from "@/features/books/service";
import { getLoanCounts } from "@/features/loans/repository";
import { BookCatalog } from "@/features/books/components/book-catalog";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { getLibraryCounts } from "@/features/readers/repository";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await getSession();
  const parsed = SearchSchema.safeParse(await searchParams);
  const filters = parsed.success ? parsed.data : {};
  const staff = isVerifiedStaff(user);

  const [initialPage, facets, counts] = await Promise.all([
    getBooksService(filters, await getVerifiedUserId(), staff),
    getFacetsService(),
    staff ? null : getLibraryCounts(),
  ]);

  const catalogue = (
    <BookCatalog
      initialPage={initialPage}
      initialFilters={filters}
      facets={facets}
      staff={staff}
      counts={counts}
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
