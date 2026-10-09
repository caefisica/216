import { requireStaffPage } from "@/features/auth/protected-action";
import { LoanDesk } from "@/features/loans/components/loan-desk";
import { DeskQuerySchema } from "@/features/loans/schemas";
import { getDeskService } from "@/features/loans/service";

export default async function LoansPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffPage();
  const { view, page, q } = DeskQuerySchema.parse((await searchParams) ?? {});
  const desk = await getDeskService(view, page, undefined, q);

  return (
    <main className="container mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
      <LoanDesk desk={desk} />
    </main>
  );
}
