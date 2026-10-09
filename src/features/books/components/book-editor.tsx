"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import {
  addCopy,
  createBook,
  createDonor,
  deleteBook,
  deleteCopy,
  getBooks,
  updateBook,
  updateCopy,
} from "../actions";
import { defaultLocation } from "../location";
import { ORIGIN_LABELS } from "../labels";
import { draftFromCopy, draftToInput, emptyDraft, findDonor, type CopyDraft } from "../copy-draft";
import { CopyForm } from "./copy-form";
import { ImageManager } from "./image-manager";
import type {
  BookDetailed,
  BookListItem,
  CatalogueFacets,
  CategoryRef,
  CopyView,
  LocationOption,
} from "../types";

const selectClass =
  "h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500";

interface BookEditorProps {
  facets: CatalogueFacets & { locations: LocationOption[] };
  book?: BookDetailed;
}

interface BookDraft {
  title: string;
  author: string;
  isbn: string;
  description: string;
  categoryId: string;
}

interface Issued {
  id: string;
  code: string;
  copyCode: string;
}

export function BookEditor({ facets, book }: BookEditorProps) {
  const router = useRouter();
  const [fields, setFields] = useState<BookDraft>({
    title: book?.title ?? "",
    author: book?.author ?? "",
    isbn: book?.isbn ?? "",
    description: book?.description ?? "",
    categoryId: book?.categoryId ?? "",
  });
  const [copyDraft, setCopyDraft] = useState<CopyDraft>(emptyDraft());
  const [locationTouched, setLocationTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [matches, setMatches] = useState<BookListItem[]>([]);
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
    const category = leaves.get(categoryId);
    if (!book && category && !locationTouched) {
      const locationId = defaultLocation(facets.locations, category, 1) ?? "";
      setCopyDraft((prev) => ({ ...prev, locationId }));
    }
  };

  useEffect(() => {
    if (book || fields.title.trim().length < 3) {
      setMatches([]);
      return;
    }
    const handler = setTimeout(async () => {
      const result = await getBooks({ search: fields.title });
      if (!isErr(result)) setMatches(result.value.items.slice(0, 5));
    }, 300);
    return () => clearTimeout(handler);
  }, [fields.title, book]);

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

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fields.categoryId) {
      toast({ title: "Elige una categoría", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const donor = await donorIdFor(copyDraft.donorName);
      if (!donor) return;
      const result = await createBook({
        ...bookInput(),
        copy: draftToInput(copyDraft, donor.id),
      });
      if (isErr(result)) {
        toastActionError(result.error);
        return;
      }
      setIssued(result.value);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const addAnother = () => {
    setIssued(null);
    setFields((prev) => ({
      title: "",
      author: "",
      isbn: "",
      description: "",
      categoryId: prev.categoryId,
    }));
    setCopyDraft((prev) =>
      emptyDraft({
        origin: prev.origin,
        locationId: prev.locationId,
        donorName: prev.donorName,
        country: prev.country,
        publisher: prev.publisher,
      }),
    );
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!book) return;
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
    if (!book) return;
    const result = await deleteBook({ bookId: book.id });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Libro eliminado" });
    router.push("/");
    router.refresh();
  };

  if (issued) {
    return (
      <div className="mx-auto max-w-xl space-y-6 rounded border bg-white p-8 text-center">
        <p className="text-sm text-gray-500">Libro registrado. Escribe este código en el lomo:</p>
        <p className="font-mono text-5xl font-bold tracking-wide">{issued.copyCode}</p>
        <p className="text-sm text-gray-500">Código del libro {issued.code}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={addAnother}>Agregar otro</Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/books/${issued.id}`}>Añadir imágenes o ejemplares</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Volver al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const form = (
    <form
      onSubmit={book ? handleUpdate : handleCreate}
      className="space-y-4 rounded border bg-white p-6"
    >
      <h2 className="text-lg font-semibold">{book ? "Datos del libro" : "Nuevo libro"}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Título</Label>
          <Input
            required
            autoFocus
            value={fields.title}
            onChange={(e) => setField({ title: e.target.value })}
          />
          {matches.length > 0 && (
            <ul className="mt-2 divide-y rounded border text-sm">
              <li className="bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800">
                Ya hay libros parecidos. Si es el mismo título, agrega un ejemplar en lugar de crear
                otro.
              </li>
              {matches.map((match) => (
                <li key={match.id} className="flex items-center justify-between px-3 py-1.5">
                  <span>
                    <span className="mr-2 font-mono text-xs text-gray-500">{match.code}</span>
                    {match.title}
                  </span>
                  <Link href={`/admin/books/${match.id}`} className="text-blue-600 hover:underline">
                    Agregar un ejemplar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <Label>Autor</Label>
          <Input value={fields.author} onChange={(e) => setField({ author: e.target.value })} />
        </div>
        <div>
          <Label>ISBN</Label>
          <Input value={fields.isbn} onChange={(e) => setField({ isbn: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Categoría</Label>
          <select
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
          {book && (
            <p className="mt-1 text-xs text-gray-500">
              Cambiar la categoría no cambia el código {book.code}.
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <Label>Descripción</Label>
          <Textarea
            value={fields.description}
            onChange={(e) => setField({ description: e.target.value })}
          />
        </div>
      </div>

      {!book && (
        <>
          <h3 className="pt-2 text-base font-semibold">Primer ejemplar</h3>
          <CopyForm
            draft={copyDraft}
            onChange={(patch) => {
              if ("locationId" in patch) setLocationTouched(true);
              setCopyDraft((prev) => ({ ...prev, ...patch }));
            }}
            locations={facets.locations}
            donors={donors}
          />
        </>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {book ? "Guardar cambios" : "Registrar libro"}
      </Button>
    </form>
  );

  if (!book) return form;

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
      <div className="rounded border border-red-100 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-red-700">Eliminar libro</h2>
        <p className="mb-3 text-sm text-gray-600">
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
    <div className="space-y-3 rounded border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ejemplares ({book.copies.length})</h2>
        <Button size="sm" variant="outline" onClick={startAdding}>
          <Plus className="mr-1 h-4 w-4" /> Agregar ejemplar
        </Button>
      </div>

      {book.copies.length === 0 && !adding && (
        <p className="text-sm text-gray-500">
          Este libro no tiene ejemplares. Agrega el primero para que se pueda prestar.
        </p>
      )}

      <ul className="divide-y">
        {book.copies.map((copy) => (
          <li key={copy.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-mono">{copy.code}</span>
                <span className="ml-3 text-gray-600">
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
