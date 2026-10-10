// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogueFacets, LocationOption } from "../types";
import { BookIntakeForm } from "./book-intake-form";

const actionMocks = vi.hoisted(() => ({
  addCopy: vi.fn(),
  createIntakeBook: vi.fn(),
  getBooks: vi.fn(),
}));

vi.mock("../actions", () => actionMocks);

const categoryId = "00000000-0000-4000-8000-000000000001";
const facets = {
  categories: [
    {
      id: categoryId,
      parentId: null,
      code: "FG",
      name: "Física",
      nextNumber: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      bookCount: 0,
      children: [],
    },
  ],
  donors: [],
  copyHealth: { present: 0, maintenance: 0, missing: 0, unlabelled: 0, unplaced: 0 },
  locations: [],
} satisfies CatalogueFacets & { locations: LocationOption[] };

beforeEach(() => {
  actionMocks.createIntakeBook.mockReset();
  actionMocks.addCopy.mockReset();
  actionMocks.getBooks.mockReset();
  actionMocks.getBooks.mockResolvedValue({ ok: true, value: { items: [] } });
  localStorage.clear();
});
afterEach(cleanup);

describe("BookIntakeForm", () => {
  it("opens on the category used for the last book", async () => {
    localStorage.setItem("216:intake-category", categoryId);
    render(<BookIntakeForm facets={facets} />);

    await waitFor(() =>
      expect((screen.getByLabelText("Categoría") as unknown as HTMLSelectElement).value).toBe(
        categoryId,
      ),
    );
  });

  it("shows inline validation and does not submit incomplete intake", () => {
    render(<BookIntakeForm facets={facets} />);

    fireEvent.click(screen.getByRole("button", { name: "Registrar libro" }));

    expect(screen.getByText("Escribe el título.")).toBeTruthy();
    expect(screen.getByText("Elige una categoría.")).toBeTruthy();
    expect(actionMocks.createIntakeBook).not.toHaveBeenCalled();
  });

  it("shows the code to write on the spine and starts the next book on the same category", async () => {
    actionMocks.createIntakeBook.mockResolvedValue({
      ok: true,
      value: { id: "book-id", code: "CAFG01", copyCode: "CAFG01.1", copies: 2 },
    });
    render(<BookIntakeForm facets={facets} />);

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Mecánica" } });
    fireEvent.change(screen.getByLabelText("Autor"), { target: { value: "Ana Física" } });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: categoryId } });
    fireEvent.change(screen.getByLabelText("Ejemplares"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar libro" }));

    await waitFor(() => expect(screen.getByText("Escribe en el lomo")).toBeTruthy());
    expect(screen.getByText("CAFG01.1")).toBeTruthy();
    expect(actionMocks.createIntakeBook).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Mecánica", copies: 2, categoryId }),
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Registrar otro" }));

    fireEvent.click(screen.getByRole("button", { name: "Registrar otro" }));

    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Autor") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(/ISBN/) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Categoría") as unknown as HTMLSelectElement).value).toBe(
      categoryId,
    );
    expect((screen.getByLabelText("Ejemplares") as HTMLInputElement).value).toBe("1");
  });

  it("adds a copy to an existing title when a match is found", async () => {
    actionMocks.addCopy.mockResolvedValue({ ok: true, value: { code: "CAFG01.2" } });
    actionMocks.getBooks.mockResolvedValue({
      ok: true,
      value: {
        items: [
          {
            id: "existing-book",
            code: "CAFG01",
            title: "Mecánica",
            author: null,
            imageUrl: null,
            category: { id: categoryId, code: "FG", name: "Física", parent: null },
            copyCount: 1,
            lendableCount: 1,
            heartsCount: 0,
            isHearted: false,
          },
        ],
      },
    });
    render(<BookIntakeForm facets={facets} />);

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Mecánica" } });

    const button = await screen.findByRole("button", { name: "Agregar ejemplar" });
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText("Ejemplar CAFG01.2")).toBeTruthy());
    expect(actionMocks.addCopy).toHaveBeenCalledWith(
      expect.objectContaining({ bookId: "existing-book", origin: "copy", pieces: 1 }),
    );
  });
});
