// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Actions from "../actions";
import type { BookDetailed, CatalogueFacets, CopyView, LocationOption } from "../types";
import { BookEditor } from "./book-editor";

const mocks = vi.hoisted(() => ({
  updateBook: vi.fn<typeof Actions.updateBook>(),
  deleteBook: vi.fn<typeof Actions.deleteBook>(),
  createDonor: vi.fn<typeof Actions.createDonor>(),
  addCopy: vi.fn<typeof Actions.addCopy>(),
  updateCopy: vi.fn<typeof Actions.updateCopy>(),
  deleteCopy: vi.fn<typeof Actions.deleteCopy>(),
  refresh: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../actions", () => ({
  updateBook: mocks.updateBook,
  deleteBook: mocks.deleteBook,
  createDonor: mocks.createDonor,
  addCopy: mocks.addCopy,
  updateCopy: mocks.updateCopy,
  deleteCopy: mocks.deleteCopy,
  uploadBookImage: vi.fn(),
  addBookImage: vi.fn(),
  setCoverImage: vi.fn(),
  deleteBookImage: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }),
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const categoryId = "00000000-0000-4000-8000-000000000001";
const facets = {
  categories: [
    {
      id: categoryId,
      parentId: null,
      code: "FG",
      name: "Física",
      nextNumber: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      bookCount: 1,
      children: [],
    },
  ],
  donors: [],
  copyHealth: { present: 1, maintenance: 0, missing: 0, unlabelled: 0, unplaced: 0 },
  locations: [],
} satisfies CatalogueFacets & { locations: LocationOption[] };

const copy: CopyView = {
  id: "00000000-0000-4000-8000-000000000002",
  bookId: "00000000-0000-4000-8000-000000000003",
  number: 1,
  code: "FG01.1",
  origin: "original",
  volume: null,
  pieces: 1,
  edition: null,
  year: null,
  country: null,
  publisher: null,
  locationId: null,
  donorId: null,
  status: "present",
  condition: null,
  labelled: true,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  location: null,
  donor: null,
  loanId: null,
  dueDate: null,
};

const book: BookDetailed = {
  id: copy.bookId,
  code: "FG01",
  categoryId,
  title: "Mecánica",
  author: "Landau",
  search: "mecanica landau",
  titleKey: "mecanica",
  isbn: null,
  description: null,
  imageUrl: null,
  nextCopy: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: categoryId, code: "FG", name: "Física", parent: null },
  images: [],
  copies: [copy],
  lendableCount: 1,
  isHearted: false,
  request: null,
};

const refusal = (message: string) => ({
  ok: false as const,
  error: { code: "failed" as const, message },
});

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
afterEach(cleanup);

describe("BookEditor", () => {
  it("shows a refused save above Guardar and keeps what was typed", async () => {
    mocks.updateBook.mockResolvedValue(refusal("Ya existe un libro con ese ISBN."));
    render(<BookEditor facets={facets} book={book} />);

    fireEvent.change(screen.getByLabelText("ISBN"), { target: { value: "9780750628969" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Ya existe un libro");
    expect((screen.getByLabelText("ISBN") as unknown as HTMLInputElement).value).toBe(
      "9780750628969",
    );
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("shows a refused copy change inside the copy's form", async () => {
    mocks.updateCopy.mockResolvedValue(refusal("El ejemplar no existe."));
    render(<BookEditor facets={facets} book={book} />);

    fireEvent.click(screen.getByRole("button", { name: /^Editar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar ejemplar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("El ejemplar no existe.");
    expect(screen.getByRole("button", { name: "Guardar ejemplar" })).toBeTruthy();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("shows a refused donor in the copy's form and does not save the copy", async () => {
    mocks.createDonor.mockResolvedValue(refusal("Ya existe un donante con ese nombre."));
    render(<BookEditor facets={facets} book={book} />);

    fireEvent.click(screen.getByRole("button", { name: /^Editar/ }));
    fireEvent.change(screen.getByLabelText("Donante"), { target: { value: "Rosa" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar ejemplar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Ya existe un donante");
    expect(mocks.updateCopy).not.toHaveBeenCalled();
  });

  it("shows a refused copy deletion under that copy", async () => {
    mocks.deleteCopy.mockResolvedValue(refusal("El ejemplar está prestado."));
    render(<BookEditor facets={facets} book={book} />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("El ejemplar está prestado."),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("shows a refused book deletion in the delete section and stays on the page", async () => {
    mocks.deleteBook.mockResolvedValue(refusal("El libro tiene préstamos abiertos."));
    render(<BookEditor facets={facets} book={book} />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar libro" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar libro" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("El libro tiene préstamos"),
    );
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
