import Link from "next/link";
import { Availability } from "@/components/catalogue/availability";
import { buttonVariants } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { getSession, isVerifiedStaff } from "@/features/auth/protected-action";
import { getBookById } from "@/features/books/actions";
import { locationLabel } from "@/features/books/labels";
import { formatDay } from "@/features/loans/format";
import { isErr } from "@/lib/result";
import { BackLink } from "./components/back-link";
import { BookGallery } from "./components/book-gallery";
import { BorrowPanel } from "./components/borrow-panel";
import { CopyList } from "./components/copy-list";
import { FavoriteButton } from "./components/favorite-button";
import { NotFoundState } from "./components/not-found-state";
import type { BookDetailed } from "@/features/books/types";

function whereOrWhen(book: BookDetailed) {
  const onShelf = book.copies.find((copy) => copy.status === "present" && !copy.loanId);
  if (onShelf)
    return onShelf.location ? locationLabel(onShelf.location) : "Pregunta en el ambiente 216";

  const back = book.copies
    .flatMap((copy) => (copy.dueDate ? [copy.dueDate] : []))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (back) return `Vuelve hacia el ${formatDay(back)}`;
  return null;
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSession();
  const book = await getBookById(id);

  if (isErr(book)) return <NotFoundState />;
  const detail = book.value;

  const staff = isVerifiedStaff(user);
  const reader = !user ? "anonymous" : user.emailVerified ? "verified" : "unverified";
  const parent = detail.category.parent;
  // A reader who holds the last copy still needs to see that it is theirs.
  const showBorrow = !staff && (detail.lendableCount > 0 || detail.request !== null);
  const where = whereOrWhen(detail);

  return (
    <Page width="prose">
      <BackLink />

      <article className="mt-2">
        <header className="flex gap-4 sm:gap-6">
          <div className="w-28 shrink-0 sm:w-40">
            <BookGallery
              images={detail.images}
              title={detail.title}
              author={detail.author}
              category={detail.category.name}
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold leading-tight text-balance sm:text-2xl">
              {detail.title}
            </h1>
            {detail.author && (
              <p className="mt-1 text-base text-muted-foreground">{detail.author}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {parent && (
                <>
                  <Link
                    href={`/?category=${parent.code}`}
                    className="inline-flex items-center underline underline-offset-2 pointer-coarse:min-h-control"
                  >
                    {parent.name}
                  </Link>
                  {" / "}
                </>
              )}
              <Link
                href={`/?category=${detail.category.code}`}
                className="inline-flex items-center underline underline-offset-2 pointer-coarse:min-h-control"
              >
                {detail.category.name}
              </Link>
              {staff && <span className="ml-2 font-mono">{detail.code}</span>}
            </p>
          </div>
        </header>

        <section aria-label="Disponibilidad" className="mt-6 grid gap-3 border-y py-4">
          <div>
            <Availability
              lendable={detail.lendableCount}
              total={detail.copies.length}
              className="text-base"
            />
            {where && <p className="mt-0.5 text-muted-foreground">{where}</p>}
          </div>
          {showBorrow && (
            <BorrowPanel bookId={detail.id} reader={reader} request={detail.request} />
          )}
          {reader === "verified" && !staff && (
            <div className="-ml-4">
              <FavoriteButton bookId={detail.id} saved={detail.isHearted} />
            </div>
          )}
          {staff && (
            <div>
              <Link
                href={`/admin/books/${detail.id}`}
                className={buttonVariants({ variant: "secondary" })}
              >
                Editar libro
              </Link>
            </div>
          )}
        </section>

        {detail.description && (
          <p className="mt-6 max-w-prose text-base leading-relaxed">{detail.description}</p>
        )}

        <details className="mt-6" open={staff}>
          <summary className="inline-flex min-h-control items-center font-medium">
            Ejemplares ({detail.copies.length})
          </summary>
          <div className="mt-2">
            {detail.copies.length > 0 ? (
              <CopyList copies={detail.copies} staff={staff} />
            ) : (
              <p className="text-muted-foreground">Aún no hay ejemplares registrados.</p>
            )}
            {detail.isbn && (
              <p className="mt-3 text-xs text-muted-foreground">ISBN {detail.isbn}</p>
            )}
          </div>
        </details>
      </article>
    </Page>
  );
}
