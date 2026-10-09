"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { BookCover } from "@/components/catalogue/book-cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { addCopy, createIntakeBook, getBooks } from "../actions";
import { defaultLocation } from "../location";
import type { BookListItem, CatalogueFacets, LocationOption } from "../types";

interface BookIntakeFormProps {
  facets: CatalogueFacets & { locations: LocationOption[] };
}

interface IntakeFields {
  title: string;
  author: string;
  isbn: string;
  categoryId: string;
  copies: string;
}

interface IssuedBook {
  id: string;
  code: string;
  copyCode: string;
  copies: number;
}

const initialFields: IntakeFields = {
  title: "",
  author: "",
  isbn: "",
  categoryId: "",
  copies: "1",
};

export function BookIntakeForm({ facets }: BookIntakeFormProps) {
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof IntakeFields, string>>>({});
  const [issued, setIssued] = useState<IssuedBook | null>(null);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<BookListItem[]>([]);
  const [addingCopyId, setAddingCopyId] = useState<string | null>(null);
  const [addedCopy, setAddedCopy] = useState<{ id: string; code: string } | null>(null);

  const categories = useMemo(
    () =>
      facets.categories.flatMap((node) =>
        node.children.length === 0
          ? [{ id: node.id, label: node.name }]
          : node.children.map((child) => ({ id: child.id, label: `${node.name} · ${child.name}` })),
      ),
    [facets.categories],
  );
  const categoryName = categories.find((category) => category.id === fields.categoryId)?.label;

  useEffect(() => {
    const title = fields.title.trim();
    if (title.length < 3) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      const result = await getBooks({ search: title });
      if (!isErr(result)) setMatches(result.value.items.slice(0, 5));
    }, 250);
    return () => clearTimeout(timer);
  }, [fields.title]);

  const update = (patch: Partial<IntakeFields>) => {
    setFields((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as (keyof IntakeFields)[]) delete next[key];
      return next;
    });
  };

  const addExistingCopy = async (match: BookListItem) => {
    setAddingCopyId(match.id);
    const result = await addCopy({
      bookId: match.id,
      origin: "copy",
      volume: null,
      pieces: 1,
      edition: null,
      year: null,
      country: null,
      publisher: null,
      locationId: defaultLocation(facets.locations, match.category, match.copyCount + 1),
      donorId: null,
      status: "present",
      condition: null,
      labelled: false,
      notes: null,
    });
    setAddingCopyId(null);
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    setAddedCopy({ id: match.id, code: result.value.code });
  };

  const validate = () => {
    const next: Partial<Record<keyof IntakeFields, string>> = {};
    if (!fields.title.trim()) next.title = "Escribe el título.";
    if (!fields.categoryId) next.categoryId = "Elige una categoría.";
    const copies = Number(fields.copies);
    if (!Number.isInteger(copies) || copies < 1 || copies > 100) {
      next.copies = "Indica entre 1 y 100 ejemplares.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const result = await createIntakeBook({
        title: fields.title,
        author: fields.author,
        isbn: fields.isbn,
        categoryId: fields.categoryId,
        description: "",
        copies: Number(fields.copies),
      });
      if (isErr(result)) {
        toastActionError(result.error);
        return;
      }
      setIssued(result.value);
    } finally {
      setSaving(false);
    }
  };

  const addAnother = () => {
    setIssued(null);
    setFields((current) => ({ ...initialFields, categoryId: current.categoryId }));
    setErrors({});
  };

  if (issued) {
    return (
      <section className="surface mx-auto grid max-w-3xl gap-6 p-5 sm:grid-cols-[10rem_1fr] sm:p-8">
        <BookCover
          title={fields.title}
          author={fields.author}
          category={categoryName}
          className="mx-auto w-40 sm:w-full"
          priority
        />
        <div className="flex flex-col justify-center">
          <p className="eyebrow text-status-available">Libro registrado</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Listo para la estantería</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Escribe el código del primer ejemplar en el lomo. Se registraron {issued.copies}{" "}
            {issued.copies === 1 ? "ejemplar" : "ejemplares"}.
          </p>
          <p className="mt-5 font-mono text-3xl font-semibold text-foreground">{issued.copyCode}</p>
          <p className="mt-1 text-sm text-muted-foreground">Libro {issued.code}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={addAnother}>
              <BookOpen /> Agregar otro
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/books/${issued.id}`}>Ver ficha</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Volver al catálogo</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const fieldClass = (field: keyof IntakeFields) =>
    errors[field] ? "border-destructive focus-visible:ring-destructive" : "";

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="surface space-y-6 p-5 sm:p-8">
        <div>
          <p className="eyebrow">Entrada rápida</p>
          <h1 className="mt-2 text-[1.875rem] font-semibold tracking-tight">Registrar libro</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Anota los datos básicos. El sistema genera los códigos de libro y ejemplar.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="intake-title">Título</Label>
          <Input
            id="intake-title"
            autoFocus
            value={fields.title}
            onChange={(event) => update({ title: event.target.value })}
            aria-invalid={Boolean(errors.title)}
            className={fieldClass("title")}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          {matches.length > 0 && (
            <ul className="mt-2 divide-y rounded-md border border-border text-sm">
              <li className="bg-accent px-3 py-2 text-xs text-accent-foreground">
                Ya existe un título parecido. Si es el mismo, agrega un ejemplar.
              </li>
              {matches.map((match) => (
                <li key={match.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {match.code}
                    </span>
                    {match.title}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 font-medium text-primary underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60"
                    disabled={addingCopyId === match.id || addedCopy?.id === match.id}
                    onClick={() => void addExistingCopy(match)}
                  >
                    {addedCopy?.id === match.id
                      ? `Ejemplar ${addedCopy.code} agregado`
                      : "Agregar un ejemplar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="intake-author">Autor</Label>
            <Input
              id="intake-author"
              value={fields.author}
              onChange={(event) => update({ author: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intake-isbn">ISBN</Label>
            <Input
              id="intake-isbn"
              inputMode="numeric"
              value={fields.isbn}
              onChange={(event) => update({ isbn: event.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <div className="space-y-2">
            <Label htmlFor="intake-category">Categoría</Label>
            <select
              id="intake-category"
              value={fields.categoryId}
              onChange={(event) => update({ categoryId: event.target.value })}
              aria-invalid={Boolean(errors.categoryId)}
              className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/25 ${fieldClass("categoryId")}`}
            >
              <option value="">Elige una categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="intake-copies">Ejemplares</Label>
            <Input
              id="intake-copies"
              type="number"
              min={1}
              max={100}
              value={fields.copies}
              onChange={(event) => update({ copies: event.target.value })}
              aria-invalid={Boolean(errors.copies)}
              className={fieldClass("copies")}
            />
            {errors.copies && <p className="text-sm text-destructive">{errors.copies}</p>}
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="animate-spin" /> : <Check />}
          {saving ? "Registrando…" : "Registrar libro"}
        </Button>
      </div>

      <aside className="surface self-start p-3 sm:p-4">
        <p className="eyebrow mb-3">Portada</p>
        <BookCover
          title={fields.title || "Tu libro"}
          author={fields.author || undefined}
          category={categoryName}
          priority
        />
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Portada generada hasta que haya una imagen guardada.
        </p>
      </aside>
    </form>
  );
}
