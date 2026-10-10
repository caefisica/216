import { getSession, getVerifiedUserId, isVerifiedStaff } from "@/features/auth/protected-action";
import { SearchSchema } from "@/features/books/schemas";
import { getBooksService, getFacetsService } from "@/features/books/service";
import { BookList } from "@/features/books/components/book-list";
import { CatalogueSearch } from "@/features/books/components/catalogue-search";
import { Page } from "@/components/ui/page";

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

  const [result, facets] = await Promise.all([
    getBooksService(filters, await getVerifiedUserId(), staff),
    getFacetsService(),
  ]);

  return (
    <Page>
      <h1 className="sr-only">Catálogo</h1>
      <CatalogueSearch
        filters={filters}
        categories={facets.categories}
        review={staff ? facets.copyHealth : undefined}
      >
        <BookList result={result} filters={filters} staff={staff} />
      </CatalogueSearch>
    </Page>
  );
}
