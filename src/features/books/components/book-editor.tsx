"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { addCopy, createDonor, deleteBook, deleteCopy, updateBook, updateCopy } from "../actions";
import { defaultLocation } from "../location";
import { ORIGIN_LABELS } from "../labels";
import { draftFromCopy, draftToInput, emptyDraft, findDonor, type CopyDraft } from "../copy-draft";
import { ConfirmDelete } from "./confirm-delete";
import { CopyForm } from "./copy-form";
import { ImageManager } from "./image-manager";
import type {
  BookDetailed,
  CatalogueFacets,
  CategoryRef,
  CopyView,
  LocationOption,
} from "../types";

interface BookEditorProps {
  facets: CatalogueFacets & { locations: LocationOption[] };
  book: BookDetailed;
}

interface BookDraft {
  title: string;
  author: string;
  isbn: string;
  description: string;
  categoryId: string;
}

export function BookEditor({ facets, book }: BookEditorProps) {
  const router = useRouter();
  const [fields, setFields] = useState<BookDraft>({
    title: book.title,
    author: book.author ?? "",
    isbn: book.isbn ?? "",
    description: book.description ?? "",
    categoryId: book.categoryId,
  });
  const [saving, setSaving] = useState(false);
  const [donors, setDonors] = useState(facets.donors);

  const leaves = useMemo(() => {
    const byId = new Map<string, CategoryRef>();
    for (const node of facets.categories) {
      if (node.children.length === 0) {
        byId.set(node.id, { id: node.id, code: node.code, name: node.name, parent: null });
      }
      for (const child of node.children) {
        byId.set(child.id, {
          id: child.id,
          code: child.code,
          name: child.name,
          parent: { id: node.id, code: node.code, name: node.name },
        });
      }
    }
    return byId;
  }, [facets.categories]);

  const setField = (patch: Partial<BookDraft>) => setFields((prev) => ({ ...prev, ...patch }));

  async function donorIdFor(name: string) {
    if (name.trim() === "") return { id: null };
    const known = findDonor(name, donors);
    if (known) return { id: known.id };
    const created = await createDonor({ name });
    if (isErr(created)) {
      toastActionError(created.error);
      return null;
    }
    setDonors((prev) => [...prev, { ...created.value, copyCount: 0 }]);
    return { id: created.value.id };
  }

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await updateBook({ id: book.id, ...fields });
      if (isErr(result)) {
        toastActionError(result.error);
        return;
      }
      toast({ title: "Libro guardado" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const result = await deleteBook({ bookId: book.id });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Libro eliminado", description: book.title });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="grid gap-8">
      <form onSubmit={handleUpdate} className="grid gap-4">
        <Field label="Título">
          <Input
            required
            value={fields.title}
            onChange={(event) => setField({ title: event.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Autor">
            <Input
              value={fields.author}
              onChange={(event) => setField({ author: event.target.value })}
            />
          </Field>
          <Field label="ISBN">
            <Input
              value={fields.isbn}
              onChange={(event) => setField({ isbn: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Categoría" hint={`Cambiarla no cambia el código ${book.code}.`}>
          <Select
            required
            value={fields.categoryId}
            onChange={(event) => setField({ categoryId: event.target.value })}
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
        <Field label="Descripción">
          <Textarea
            value={fields.description}
            onChange={(event) => setField({ description: event.target.value })}
          />
        </Field>
        <div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>

      <CopiesEditor
        book={book}
        locations={facets.locations}
        donors={donors}
        category={leaves.get(book.categoryId)}
        donorIdFor={donorIdFor}
      />

      <ImageManager bookId={book.id} images={book.images} />

      <section aria-labelledby="eliminar" className="grid justify-items-start gap-2 border-t pt-6">
        <h2 id="eliminar" className="text-lg font-semibold">
          Eliminar libro
        </h2>
        <p className="text-muted-foreground">
          Borra el libro con sus ejemplares, fotos y préstamos.
        </p>
        <ConfirmDelete
          label="Eliminar libro"
          title={`¿Eliminar ${book.code}?`}
          description={`${book.title} se borra con todos sus ejemplares, fotos y préstamos. No se puede deshacer.`}
          onConfirm={handleDelete}
        />
      </section>
    </div>
  );
}

interface CopiesEditorProps {
  book: BookDetailed;
  locations: LocationOption[];
  donors: { id: string; name: string }[];
  category: CategoryRef | undefined;
  donorIdFor: (name: string) => Promise<{ id: string | null } | null>;
}

function CopiesEditor({ book, locations, donors, category, donorIdFor }: CopiesEditorProps) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CopyDraft>(emptyDraft());
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const open = (copy: CopyView) => {
    setAdding(false);
    setOpenId(copy.id);
    setDraft(draftFromCopy(copy));
  };

  const startAdding = () => {
    setOpenId(null);
    setAdding(true);
    const last = book.copies[book.copies.length - 1];
    setDraft(
      emptyDraft({
        origin: book.copies.length === 0 ? "original" : "copy",
        locationId: category ? (defaultLocation(locations, category, book.nextCopy) ?? "") : "",
        donorName: last?.donor?.name ?? "",
      }),
    );
  };

  const close = () => {
    setAdding(false);
    setOpenId(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const donor = await donorIdFor(draft.donorName);
      if (!donor) return;
      const input = draftToInput(draft, donor.id);
      if (adding) {
        const added = await addCopy({ bookId: book.id, ...input });
        if (isErr(added)) {
          toastActionError(added.error);
          return;
        }
        toast({ title: `Ejemplar ${added.value.code} registrado` });
      } else {
        const updated = await updateCopy({ copyId: openId!, ...input });
        if (isErr(updated)) {
          toastActionError(updated.error);
          return;
        }
        toast({ title: "Ejemplar guardado" });
      }
      close();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (copy: CopyView) => {
    const result = await deleteCopy({ copyId: copy.id });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Ejemplar eliminado", description: copy.code });
    router.refresh();
  };

  const form = (
    <div className="grid gap-4">
      <CopyForm
        draft={draft}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        locations={locations}
        donors={donors}
      />
      <div className="flex gap-2">
        <Button variant="primary" onClick={save} disabled={saving}>
          {adding ? "Registrar ejemplar" : "Guardar ejemplar"}
        </Button>
        <Button variant="quiet" onClick={close}>
          Cancelar
        </Button>
      </div>
    </div>
  );

  return (
    <section aria-labelledby="ejemplares" className="grid gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 id="ejemplares" className="text-lg font-semibold">
          Ejemplares ({book.copies.length})
        </h2>
        {!adding && (
          <Button variant="secondary" onClick={startAdding}>
            Agregar ejemplar
          </Button>
        )}
      </div>

      {book.copies.length === 0 && !adding && (
        <p className="text-muted-foreground">
          Sin ejemplares. Agrega el primero para que se pueda prestar.
        </p>
      )}

      {book.copies.length > 0 && (
        <ul className="divide-y border-y">
          {book.copies.map((copy) => (
            <li key={copy.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono">{copy.code}</span>
                  <span className="ml-3 text-muted-foreground">
                    {ORIGIN_LABELS[copy.origin]}
                    {copy.volume ? ` · tomo ${copy.volume}` : ""}
                    {copy.loanId ? " · prestado" : ""}
                    {!copy.labelled ? " · sin etiqueta" : ""}
                  </span>
                </div>
                {openId !== copy.id && (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => open(copy)}>
                      Editar<span className="sr-only"> {copy.code}</span>
                    </Button>
                    <ConfirmDelete
                      label="Eliminar"
                      title={`¿Eliminar ${copy.code}?`}
                      description="Se borra el ejemplar y su historial de préstamos. No se puede deshacer."
                      onConfirm={() => remove(copy)}
                    />
                  </div>
                )}
              </div>
              {openId === copy.id && <div className="mt-3">{form}</div>}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="grid gap-3 rounded-md bg-sunken p-4">
          <h3 className="font-semibold">Nuevo ejemplar</h3>
          {form}
        </div>
      )}
    </section>
  );
}
