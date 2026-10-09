import { getSession, getVerifiedUserId, isVerifiedStaff } from "@/features/auth/protected-action";
import { SearchSchema } from "@/features/books/schemas";
import { getBooksService, getFacetsService } from "@/features/books/service";
import { listActiveLoans } from "@/features/admin/repository";
import { getPendingRequestsService } from "@/features/admin/service";
import { BookCatalog } from "@/features/books/components/book-catalog";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await getSession();
  const parsed = SearchSchema.safeParse(await searchParams);
  const filters = parsed.success ? parsed.data : {};
  const staff = isVerifiedStaff(user);

  const [initialPage, facets] = await Promise.all([
    getBooksService(filters, await getVerifiedUserId(), staff),
    getFacetsService(),
  ]);

  const catalogue = (
    <BookCatalog initialPage={initialPage} initialFilters={filters} facets={facets} staff={staff} />
  );

  if (staff) {
    const [initialPendingRequests, initialActiveLoans] = await Promise.all([
      getPendingRequestsService(),
      listActiveLoans(),
    ]);

    return (
      <main className="container mx-auto px-6 py-12">
        <AdminDashboard
          catalogue={catalogue}
          initialPendingRequests={initialPendingRequests}
          initialActiveLoans={initialActiveLoans}
        />
      </main>
    );
  }

  return <main className="container mx-auto px-6 py-12">{catalogue}</main>;
}
