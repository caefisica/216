import { Page } from "@/components/ui/page";
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
    <Page width="page">
      <LoanDesk desk={desk} />
    </Page>
  );
}
