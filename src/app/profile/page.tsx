import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CardList } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Empty } from "@/components/ui/empty";
import { Page, PageTitle, SectionTitle } from "@/components/ui/page";
import { requireVerifiedPage } from "@/features/auth/protected-action";
import { BookRow } from "@/features/books/components/book-row";
import { getFavoriteBooksService } from "@/features/books/service";
import { listUserActivity } from "@/features/users/repository";
import { AccountForm } from "./account-form";
import { LoanRow, isCurrent } from "./loan-rows";

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
      <PageTitle>Mis libros</PageTitle>

      <section aria-labelledby="ahora" className="mt-8">
        <SectionTitle id="ahora" className="mb-3">
          Ahora
        </SectionTitle>
        {current.length > 0 ? (
          <CardList>
            {current.map((request) => (
              <LoanRow key={request.id} request={request} now={now} />
            ))}
          </CardList>
        ) : (
          <Empty
            title="No tienes libros pedidos"
            className="py-4"
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

      <section aria-labelledby="guardados" className="mt-10">
        <SectionTitle id="guardados" className="mb-3">
          Guardados
        </SectionTitle>
        {saved.length > 0 ? (
          <CardList>
            {saved.map((book) => (
              <BookRow key={book.id} book={book} heading="h3" />
            ))}
          </CardList>
        ) : (
          <Empty title="Nada guardado" className="py-4">
            Guarda un libro desde su página para ver aquí si ya está disponible.
          </Empty>
        )}
      </section>

      {past.length > 0 && (
        <Disclosure title="Anteriores" detail={past.length} className="mt-10">
          <CardList>
            {past.map((request) => (
              <LoanRow key={request.id} request={request} now={now} />
            ))}
          </CardList>
        </Disclosure>
      )}

      <Disclosure title="Cuenta" className="mt-6">
        <AccountForm name={user.name} email={user.email} />
      </Disclosure>
    </Page>
  );
}
