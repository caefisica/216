"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/catalogue/book-cover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { addCopy, createDonor, deleteBook, deleteCopy, updateBook, updateCopy } from "../actions";
import { defaultLocation } from "../location";
import { ORIGIN_LABELS } from "../labels";
import { draftFromCopy, draftToInput, emptyDraft, findDonor, type CopyDraft } from "../copy-draft";
import { CopyForm } from "./copy-form";
import { ImageManager } from "./image-manager";
import type {
  BookDetailed,
  CatalogueFacets,
  CategoryRef,
  CopyView,
  LocationOption,
} from "../types";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/25";

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

  const changeCategory = (categoryId: string) => {
    setField({ categoryId });
  };

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

  const bookInput = () => ({
    title: fields.title,
    author: fields.author,
    isbn: fields.isbn,
    description: fields.description,
    categoryId: fields.categoryId,
  });

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await updateBook({ id: book.id, ...bookInput() });
      if (isErr(result)) {
        toastActionError(result.error);
        return;
      }
      toast({ title: "Libro actualizado" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  const handleDelete = async () => {
    const result = await deleteBook({ bookId: book.id });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Libro eliminado" });
    router.push("/");
    router.refresh();
  };

  const form = (
    <form onSubmit={handleUpdate} className="surface space-y-5 p-5 sm:p-8">
      <div className="flex items-start gap-4">
        <BookCover
          title={fields.title || "Tu libro"}
          author={fields.author || undefined}
          category={leaves.get(fields.categoryId)?.name}
          imageUrl={book.imageUrl}
          priority
          className="w-20 shrink-0 sm:w-24"
        />
        <div>
          <p className="eyebrow">Ficha del libro</p>
          <h2 className="mt-2 text-xl font-semibold">Datos del libro</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {book.imageUrl ? "Portada guardada" : "Portada generada"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="book-title">Título</Label>
          <Input
            id="book-title"
            required
            autoFocus
            value={fields.title}
            onChange={(e) => setField({ title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="book-author">Autor</Label>
          <Input
            id="book-author"
            value={fields.author}
            onChange={(e) => setField({ author: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="book-isbn">ISBN</Label>
          <Input
            id="book-isbn"
            value={fields.isbn}
            onChange={(e) => setField({ isbn: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="book-category">Categoría</Label>
          <select
            id="book-category"
            required
            className={selectClass}
            value={fields.categoryId}
            onChange={(e) => changeCategory(e.target.value)}
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
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Cambiar la categoría no cambia el código {book.code}.
          </p>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="book-description">Descripción</Label>
          <Textarea
            id="book-description"
            value={fields.description}
            onChange={(e) => setField({ description: e.target.value })}
          />
        </div>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Guardar cambios
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      {form}
      <CopiesEditor
        book={book}
        locations={facets.locations}
        donors={donors}
        category={leaves.get(book.categoryId)}
        donorIdFor={donorIdFor}
      />
      <ImageManager bookId={book.id} images={book.images} />
      <div className="surface border-destructive/30 p-5 sm:p-8">
        <h2 className="mb-2 text-lg font-semibold text-destructive">Eliminar libro</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Borra el libro con sus ejemplares, imágenes y préstamos. No se puede deshacer.
        </p>
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete}>
              Sí, eliminar {book.code}
            </Button>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        )}
      </div>
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
  const [confirmId, setConfirmId] = useState<string | null>(null);
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
        toast({ title: "Ejemplar actualizado" });
      }
      setAdding(false);
      setOpenId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (copyId: string) => {
    const result = await deleteCopy({ copyId });
    setConfirmId(null);
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Ejemplar eliminado" });
    router.refresh();
  };

  return (
    <div className="surface space-y-3 p-5 sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ejemplares ({book.copies.length})</h2>
        <Button size="sm" variant="outline" onClick={startAdding}>
          <Plus className="mr-1 h-4 w-4" /> Agregar ejemplar
        </Button>
      </div>

      {book.copies.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          Este libro no tiene ejemplares. Agrega el primero para que se pueda prestar.
        </p>
      )}

      <ul className="divide-y">
        {book.copies.map((copy) => (
          <li key={copy.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-mono">{copy.code}</span>
                <span className="ml-3 text-muted-foreground">
                  {ORIGIN_LABELS[copy.origin]}
                  {copy.volume ? ` · ${copy.volume}` : ""}
                  {copy.loanId ? " · prestado" : ""}
                  {!copy.labelled ? " · sin etiqueta" : ""}
                </span>
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => open(copy)}>
                  Editar
                </Button>
                {confirmId === copy.id ? (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => remove(copy.id)}>
                      Confirmar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setConfirmId(copy.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </span>
            </div>
            {openId === copy.id && (
              <div className="mt-3 space-y-3">
                <CopyForm
                  draft={draft}
                  onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
                  locations={locations}
                  donors={donors}
                />
                <Button size="sm" onClick={save} disabled={saving}>
                  Guardar ejemplar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="space-y-3 border-t pt-3">
          <h3 className="text-base font-semibold">Nuevo ejemplar</h3>
          <CopyForm
            draft={draft}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            locations={locations}
            donors={donors}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              Registrar ejemplar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
