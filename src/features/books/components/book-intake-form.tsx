"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
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

const CATEGORY_KEY = "216:intake-category";

const initialFields: IntakeFields = {
  title: "",
  author: "",
  isbn: "",
  categoryId: "",
  copies: "1",
};

/** Keeps the category between books and visits when staff register a shelf. */
export function BookIntakeForm({ facets }: BookIntakeFormProps) {
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof IntakeFields, string>>>({});
  const [issued, setIssued] = useState<IssuedBook | null>(null);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<BookListItem[]>([]);
  const [addingCopyId, setAddingCopyId] = useState<string | null>(null);
  const [addedCopy, setAddedCopy] = useState<{ id: string; code: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const categoryIds = useMemo(
    () =>
      new Set(
        facets.categories.flatMap((node) =>
          node.children.length === 0 ? [node.id] : node.children.map((child) => child.id),
        ),
      ),
    [facets.categories],
  );

  useEffect(() => {
    const remembered = localStorage.getItem(CATEGORY_KEY);
    if (remembered && categoryIds.has(remembered)) {
      setFields((current) => ({ ...current, categoryId: remembered }));
    }
  }, [categoryIds]);

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
    setMatchError(null);
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
      setMatchError(result.error.message);
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
    setFormError(null);
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
        setFormError(result.error.message);
        return;
      }
      localStorage.setItem(CATEGORY_KEY, fields.categoryId);
      setIssued(result.value);
    } finally {
      setSaving(false);
    }
  };

  const addAnother = () => {
    setIssued(null);
    setMatches([]);
    setAddedCopy(null);
    setFields((current) => ({ ...initialFields, categoryId: current.categoryId }));
    setErrors({});
    setFormError(null);
    setMatchError(null);
  };

  if (issued) {
    return (
      <Card role="status" aria-labelledby="registrado" className="grid gap-5 p-4 sm:p-6">
        <div className="grid justify-items-start gap-2">
          <Badge tone="success">
            <Check aria-hidden />
            Libro registrado
          </Badge>
          <p id="registrado" className="font-serif text-lg font-medium text-pretty">
            {fields.title}
            {issued.copies > 1 && ` · ${issued.copies} ejemplares`}
          </p>
        </div>
        <div className="grid gap-1 rounded-sm bg-sunken px-4 py-3">
          <p className="text-sm text-muted-foreground">Escribe en el lomo</p>
          <p className="font-mono text-2xl font-medium">{issued.copyCode}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" autoFocus onClick={addAnother}>
            Registrar otro
          </Button>
          <Link href={`/admin/books/${issued.id}`} className={buttonVariants()}>
            Ubicación y fotos
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Field label="Título" error={errors.title}>
          <Input
            autoFocus
            value={fields.title}
            aria-invalid={Boolean(errors.title)}
            onChange={(event) => update({ title: event.target.value })}
          />
        </Field>
        {matches.length > 0 && (
          <Card>
            <p className="px-4 pt-3 text-sm font-medium">¿Ya está en el catálogo?</p>
            <ul className="mt-1 divide-y">
              {matches.map((match) => (
                <li
                  key={match.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
                >
                  <span id={`match-${match.id}`} className="min-w-48 flex-1">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {match.code}
                    </span>
                    {match.title}
                  </span>
                  {addedCopy?.id === match.id ? (
                    <Badge tone="success" role="status">
                      <Check aria-hidden />
                      Ejemplar {addedCopy.code}
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      aria-describedby={`match-${match.id}`}
                      disabled={addingCopyId === match.id}
                      onClick={() => void addExistingCopy(match)}
                    >
                      Agregar ejemplar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <FormError message={matchError} className="mx-4 mb-3" />
          </Card>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Autor">
          <Input
            value={fields.author}
            onChange={(event) => update({ author: event.target.value })}
          />
        </Field>
        <Field label="ISBN" hint="Opcional">
          <Input
            inputMode="numeric"
            value={fields.isbn}
            onChange={(event) => update({ isbn: event.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Categoría" error={errors.categoryId}>
          <Select
            value={fields.categoryId}
            aria-invalid={Boolean(errors.categoryId)}
            onChange={(event) => update({ categoryId: event.target.value })}
          >
            <option value="">Elige una categoría</option>
            {facets.categories.map((node) =>
              node.children.length === 0 ? (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ) : (
                <optgroup key={node.id} label={node.name}>
                  {node.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ),
            )}
          </Select>
        </Field>
        <Field label="Ejemplares" error={errors.copies}>
          <Input
            type="number"
            min={1}
            max={100}
            value={fields.copies}
            aria-invalid={Boolean(errors.copies)}
            onChange={(event) => update({ copies: event.target.value })}
          />
        </Field>
      </div>

      <FormError message={formError} />

      <div>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Registrando…" : "Registrar libro"}
        </Button>
      </div>
    </form>
  );
}
