import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Page } from "@/components/ui/page";
import { requireVerifiedPage } from "@/features/auth/protected-action";
import { BookRow } from "@/features/books/components/book-row";
import { getFavoriteBooksService } from "@/features/books/service";
import { listUserActivity } from "@/features/users/repository";
import { AccountForm } from "./account-form";
import { LoanRow, isCurrent } from "./loan-rows";

const heading = "text-lg font-semibold";

export default async function ProfilePage() {
  const { user } = await requireVerifiedPage();
  const [activity, saved] = await Promise.all([
    listUserActivity(user.id),
    getFavoriteBooksService(user.id),
  ]);
  const now = new Date();
  const current = activity.filter((request) => isCurrent(request, now));
  const past = activity.filter((request) => !isCurrent(request, now));

  return (
    <Page width="prose">
      <h1 className="text-xl font-semibold">Mis libros</h1>

      <section aria-labelledby="ahora" className="mt-6">
        <h2 id="ahora" className={heading}>
          Ahora
        </h2>
        {current.length > 0 ? (
          <ul className="mt-1 divide-y border-y">
            {current.map((request) => (
              <LoanRow key={request.id} request={request} now={now} />
            ))}
          </ul>
        ) : (
          <Empty
            title="No tienes libros pedidos"
            className="py-6"
            action={
              <Link href="/" className={buttonVariants({ variant: "secondary" })}>
                Buscar un libro
              </Link>
            }
          >
            Lo que pidas aparecerá aquí con la fecha de devolución.
          </Empty>
        )}
      </section>

      <section aria-labelledby="guardados" className="mt-8">
        <h2 id="guardados" className={heading}>
          Guardados
        </h2>
        {saved.length > 0 ? (
          <ul className="mt-1 divide-y border-y">
            {saved.map((book) => (
              <BookRow key={book.id} book={book} />
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-muted-foreground">
            Guarda un libro desde su página para ver aquí si ya está disponible.
          </p>
        )}
      </section>

      {past.length > 0 && (
        <details className="mt-8">
          <summary className="inline-flex min-h-control items-center text-lg font-semibold">
            Anteriores ({past.length})
          </summary>
          <ul className="mt-1 divide-y border-y">
            {past.map((request) => (
              <LoanRow key={request.id} request={request} now={now} />
            ))}
          </ul>
        </details>
      )}

      <details className="mt-8">
        <summary className="inline-flex min-h-control items-center text-lg font-semibold">
          Cuenta
        </summary>
        <AccountForm name={user.name} email={user.email} />
      </details>
    </Page>
  );
}
