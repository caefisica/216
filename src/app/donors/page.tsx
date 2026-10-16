import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Page, PageTitle, SectionTitle } from "@/components/ui/page";
import { DonorList } from "@/features/donors/components/donor-list";
import { listDonorGifts } from "@/features/donors/repository";
import { getLibraryCounts } from "@/features/readers/repository";

const steps = [
  "Lleva los libros al ambiente 216.",
  "El equipo los registra y les pone un código en el lomo.",
  "Tu nombre entra en esta lista, con una frase tuya si quieres. Si prefieres no aparecer, dilo al entregarlos.",
];

function lead(donorCount: number, copyCount: number, share: number) {
  if (donorCount === 0) {
    return "La colección crece con libros donados. Cuando llegue el primero, su donante aparecerá aquí.";
  }
  const who = donorCount === 1 ? "Una persona ha donado" : `${donorCount} personas han donado`;
  const what = copyCount === 1 ? "un ejemplar" : `${copyCount} ejemplares`;
  const ofAll = share > 0 ? `: el ${share} % de la colección` : "";
  return `${who} ${what} a la biblioteca${ofAll}. Cada uno está en el estante porque alguien decidió compartirlo.`;
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</dd>
    </div>
  );
}

export default async function DonorsPage() {
  const [{ donors, totalCopies, titleCount, loanCount }, { copyCount }] = await Promise.all([
    listDonorGifts(),
    getLibraryCounts(),
  ]);
  const share = copyCount > 0 ? Math.round((totalCopies / copyCount) * 100) : 0;

  return (
    <Page width="prose" className="grid gap-12">
      <header className="grid gap-4">
        <PageTitle className="text-balance">Gracias por cada libro que llegó al 216</PageTitle>
        <p className="max-w-measure text-lg text-pretty">
          {lead(donors.length, totalCopies, share)}
        </p>
        {donors.length > 0 && (
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
            <Figure value={totalCopies} label="Ejemplares" />
            <Figure value={titleCount} label="Títulos" />
            {loanCount > 0 && <Figure value={loanCount} label="Veces prestados" />}
          </dl>
        )}
      </header>

      <Card className="grid gap-4 p-6">
        <SectionTitle>Dona un libro</SectionTitle>
        <ol className="grid gap-3">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
              >
                {index + 1}
              </span>
              <span className="text-pretty">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <section aria-labelledby="donantes" className="grid gap-4">
        <SectionTitle id="donantes">Quienes donaron</SectionTitle>
        {donors.length === 0 ? (
          <Empty title="Todavía no hay donaciones registradas">
            Los nombres aparecen aquí cuando el equipo registra el primer libro donado.
          </Empty>
        ) : (
          <DonorList donors={donors} />
        )}
      </section>
    </Page>
  );
}
