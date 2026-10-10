import { Suspense } from "react";
import { getSession, getVerifiedUserId, isVerifiedStaff } from "@/features/auth/protected-action";
import { SearchSchema, type BookFilters } from "@/features/books/schemas";
import { getBooksService, getFacetsService } from "@/features/books/service";
import { BookList, BookListSkeleton } from "@/features/books/components/book-list";
import { CatalogueSearch } from "@/features/books/components/catalogue-search";
import type { BookPage } from "@/features/books/types";
import { Page } from "@/components/ui/page";

async function Results({
  books,
  filters,
  staff,
}: {
  books: Promise<BookPage>;
  filters: BookFilters;
  staff: boolean;
}) {
  return <BookList result={await books} filters={filters} staff={staff} />;
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await getSession();
  const parsed = SearchSchema.safeParse(await searchParams);
  const staff = isVerifiedStaff(user);
  const requested = parsed.success ? parsed.data : {};
  const filters = staff ? requested : { ...requested, unlabelled: undefined, unplaced: undefined };
  // Start the books query before awaiting facets so both queries run concurrently.
  const books = getVerifiedUserId().then((userId) => getBooksService(filters, userId, staff));
  // The catch handles a books failure if facets reject before Suspense observes it.
  books.catch(() => {});
  const facets = await getFacetsService();

  return (
    <Page>
      <h1 className="mb-6 font-serif text-2xl font-medium sm:text-3xl">Catálogo</h1>
      <CatalogueSearch
        filters={filters}
        categories={facets.categories}
        review={staff ? facets.copyHealth : undefined}
      >
        {/* CatalogueSearch navigates in a useTransition, which keeps the previous results mounted while the new ones load. */}
        <Suspense fallback={<BookListSkeleton />}>
          <Results books={books} filters={filters} staff={staff} />
        </Suspense>
      </CatalogueSearch>
    </Page>
  );
}
