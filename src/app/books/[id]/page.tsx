import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Availability } from "@/components/catalogue/availability";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Page, PageTitle } from "@/components/ui/page";
import { getSession, isVerifiedStaff } from "@/features/auth/protected-action";
import { getBookById } from "@/features/books/actions";
import { locationLabel } from "@/features/books/labels";
import { daysOverdue, formatDay } from "@/features/loans/format";
import { isErr } from "@/lib/result";
import { BackLink } from "./components/back-link";
import { BookGallery } from "./components/book-gallery";
import { BorrowPanel } from "./components/borrow-panel";
import { CopyList } from "./components/copy-list";
import { FavoriteButton } from "./components/favorite-button";
import { NotFoundState } from "./components/not-found-state";
import type { BookDetailed } from "@/features/books/types";

/** A due date that has passed promises nothing, so only dates still ahead say when it returns. */
function whereOrWhen(book: BookDetailed, now: Date) {
  const onShelf = book.copies.find((copy) => copy.status === "present" && !copy.loanId);
  if (onShelf)
    return onShelf.location ? locationLabel(onShelf.location) : "Pregunta en el ambiente 216";

  const dates = book.copies.flatMap((copy) => (copy.dueDate ? [copy.dueDate] : []));
  const back = dates
    .filter((date) => daysOverdue(date, now) === null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (back) return `Vuelve hacia el ${formatDay(back)}`;
  if (dates.length > 0) return "Prestado, sin fecha de vuelta";
  return book.copies.length > 0 ? "Ningún ejemplar está en circulación" : null;
}

const crumb =
  "inline-flex items-center rounded-sm transition-colors hover:text-foreground pointer-coarse:min-h-control";

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
  // oxlint-disable-next-line react/purity -- A server component renders once per request.
  const now = new Date();
  const where = whereOrWhen(detail, now);

  return (
    <Page>
      <BackLink />

      <article className="mt-4 grid gap-6 sm:mt-6 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <div className="w-32 sm:w-auto">
          <BookGallery
            images={detail.images}
            title={detail.title}
            author={detail.author}
            category={detail.category.name}
          />
        </div>

        <div className="min-w-0">
          <header>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {parent && (
                <>
                  <Link href={`/?category=${parent.code}`} className={crumb}>
                    {parent.name}
                  </Link>
                  <ChevronRight aria-hidden className="size-4" />
                </>
              )}
              <Link href={`/?category=${detail.category.code}`} className={crumb}>
                {detail.category.name}
              </Link>
              {staff && <span className="ml-2 font-mono text-xs">{detail.code}</span>}
            </p>
            <PageTitle className="mt-2 text-balance hyphens-auto">{detail.title}</PageTitle>
            {detail.author && <p className="mt-2 text-lg text-muted-foreground">{detail.author}</p>}
          </header>

          <Card aria-label="Disponibilidad" role="region" className="mt-6 grid gap-4 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="grid min-w-0 justify-items-start gap-2">
                <Availability lendable={detail.lendableCount} total={detail.copies.length} />
                {where && <p className="text-sm text-pretty text-muted-foreground">{where}</p>}
              </div>
              {reader === "verified" && !staff && (
                <FavoriteButton
                  bookId={detail.id}
                  saved={detail.isHearted}
                  className="-my-1.5 -mr-2 shrink-0 pointer-coarse:-my-2.5"
                />
              )}
            </div>
            {showBorrow && (
              <div className="border-t pt-4">
                <BorrowPanel
                  bookId={detail.id}
                  reader={reader}
                  request={detail.request}
                  now={now}
                />
              </div>
            )}
            {staff && (
              <div className="border-t pt-4">
                <Link
                  href={`/admin/books/${detail.id}`}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Editar libro
                </Link>
              </div>
            )}
          </Card>

          {detail.description && (
            <p className="mt-8 max-w-measure text-base text-pretty">{detail.description}</p>
          )}

          <Disclosure
            title="Ejemplares"
            detail={detail.copies.length}
            open={staff}
            className="mt-8"
          >
            <div className="grid gap-4">
              {detail.copies.length > 0 ? (
                <CopyList copies={detail.copies} staff={staff} now={now} />
              ) : (
                <p className="text-muted-foreground">Aún no hay ejemplares registrados.</p>
              )}
              {detail.isbn && (
                <p className="text-sm text-muted-foreground">
                  ISBN <span className="font-mono text-xs">{detail.isbn}</span>
                </p>
              )}
            </div>
          </Disclosure>
        </div>
      </article>
    </Page>
  );
}
