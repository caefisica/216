// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookPage } from "../types";
import { BookCatalog } from "./book-catalog";

const actionMocks = vi.hoisted(() => ({
  getBooks: vi.fn(),
  setHeart: vi.fn(),
}));

vi.mock("../actions", () => actionMocks);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn(), toastActionError: vi.fn() }));

const initialPage: BookPage = {
  items: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      code: "CAT001",
      title: "Un título de prueba",
      author: "Una autora",
      imageUrl: null,
      category: {
        id: "00000000-0000-4000-8000-000000000002",
        code: "CAT",
        name: "Ciencia",
        parent: null,
      },
      copyCount: 1,
      lendableCount: 1,
      isHearted: false,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
};

const facets = {
  categories: [],
  cabinets: [],
  donors: [],
  copyHealth: { present: 1, maintenance: 0, missing: 0, unlabelled: 0, unplaced: 0 },
};

function renderCatalogue() {
  return render(
    <BookCatalog
      initialPage={initialPage}
      initialFilters={{}}
      facets={facets}
      staff={false}
      counts={null}
    />,
  );
}

describe("catalogue favorite controls", () => {
  beforeEach(() => {
    actionMocks.getBooks.mockReset();
    actionMocks.setHeart.mockReset().mockResolvedValue({ ok: true, value: { hearted: true } });
  });

  afterEach(() => cleanup());

  it("calls the favorite action from list view", async () => {
    renderCatalogue();

    fireEvent.click(screen.getByRole("button", { name: "Añadir a favoritos" }));

    await waitFor(() =>
      expect(actionMocks.setHeart).toHaveBeenCalledWith({
        bookId: initialPage.items[0].id,
        hearted: true,
      }),
    );
  });

  it("calls the favorite action from grid view", async () => {
    renderCatalogue();

    fireEvent.click(screen.getByRole("button", { name: "Vista de cuadrícula" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir a favoritos" }));

    await waitFor(() =>
      expect(actionMocks.setHeart).toHaveBeenCalledWith({
        bookId: initialPage.items[0].id,
        hearted: true,
      }),
    );
  });
});
