// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookDetailed, BookPage } from "../types";
import { BookCatalog } from "./book-catalog";

const actionMocks = vi.hoisted(() => ({
  getBookById: vi.fn(),
  getBooks: vi.fn(),
  setHeart: vi.fn(),
  createBorrowRequest: vi.fn(),
  updateCopy: vi.fn(),
}));
const routerMocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("../actions", () => actionMocks);
vi.mock("next/navigation", () => ({ useRouter: () => routerMocks }));
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
      heartsCount: 0,
      isHearted: false,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
};

const secondBook = {
  ...initialPage.items[0],
  id: "00000000-0000-4000-8000-000000000003",
  code: "CAT002",
  title: "Otro título de prueba",
};

const detailedBook = {
  id: initialPage.items[0].id,
  code: "CAT001",
  title: "Un título de prueba",
  author: "Una autora",
  isbn: null,
  description: null,
  imageUrl: null,
  categoryId: "00000000-0000-4000-8000-000000000002",
  search: "un titulo de prueba una autora",
  titleKey: "un titulo de prueba",
  nextCopy: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: initialPage.items[0].category,
  images: [],
  copies: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      bookId: initialPage.items[0].id,
      number: 1,
      code: "CAT001.1",
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
    },
  ],
  lendableCount: 1,
  isHearted: false,
  heartsCount: 0,
} satisfies BookDetailed;

const secondDetailedBook = {
  ...detailedBook,
  ...secondBook,
  copies: detailedBook.copies.map((copy) => ({
    ...copy,
    bookId: secondBook.id,
    code: "CAT002.1",
  })),
} satisfies BookDetailed;

const facets = {
  categories: [],
  cabinets: [],
  donors: [],
  copyHealth: { present: 1, maintenance: 0, missing: 0, unlabelled: 0, unplaced: 0 },
};

function renderCatalogue(page = initialPage, initialSelectedBook: BookDetailed | null = null) {
  return render(
    <BookCatalog
      initialPage={page}
      initialFilters={{}}
      facets={facets}
      staff={false}
      counts={null}
      user={null}
      initialSelectedBook={initialSelectedBook}
    />,
  );
}

describe("catalogue favorite controls", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    window.history.replaceState(null, "", "/");
    routerMocks.push.mockReset();
    actionMocks.getBookById.mockReset().mockImplementation(async (id: string) => ({
      ok: true,
      value: id === secondBook.id ? secondDetailedBook : detailedBook,
    }));
    actionMocks.getBooks.mockReset();
    actionMocks.setHeart.mockReset().mockResolvedValue({ ok: true, value: { hearted: true } });
    actionMocks.createBorrowRequest.mockReset();
    actionMocks.updateCopy.mockReset();
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

  it("shares favorite state between the list and the detail pane", async () => {
    const hearted = new Map<string, boolean>();
    actionMocks.setHeart.mockImplementation(
      async ({ bookId, hearted: next }: { bookId: string; hearted: boolean }) => {
        hearted.set(bookId, next);
        return { ok: true, value: { hearted: next } };
      },
    );
    actionMocks.getBookById.mockImplementation(async (id: string) => ({
      ok: true,
      value: {
        ...(id === secondBook.id ? secondDetailedBook : detailedBook),
        isHearted: hearted.get(id) ?? false,
        heartsCount: hearted.get(id) ? 1 : 0,
      },
    }));
    render(
      <BookCatalog
        initialPage={{ ...initialPage, items: [initialPage.items[0], secondBook], total: 2 }}
        initialFilters={{}}
        facets={facets}
        staff={false}
        counts={null}
        user={{
          id: "00000000-0000-4000-8000-000000000009",
          email: "lectora@example.com",
          name: "Lectora",
          emailVerified: true,
          role: "user",
        }}
        initialSelectedBook={null}
      />,
    );

    fireEvent.click(screen.getByRole("option", { name: /Un título de prueba/ }));
    const firstPane = await screen.findByTestId("catalogue-detail-pane");
    fireEvent.click(within(firstPane).getByRole("button", { name: "Me gusta (0)" }));
    expect(await screen.findByRole("button", { name: "Quitar de favoritos" })).not.toBeNull();
    expect(await within(firstPane).findByRole("button", { name: "Te gusta (1)" })).not.toBeNull();

    fireEvent.click(
      screen.getByRole("option", { name: /Otro título de prueba/ }).querySelector("button")!,
    );
    fireEvent.click(screen.getByRole("option", { name: /Otro título de prueba/ }));
    const secondPane = await screen.findByTestId("catalogue-detail-pane");
    expect(await within(secondPane).findByRole("button", { name: "Te gusta (1)" })).not.toBeNull();
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

  it("selects a row into the desktop detail pane", async () => {
    renderCatalogue({ ...initialPage, items: [initialPage.items[0], secondBook], total: 2 });

    fireEvent.click(screen.getByRole("option", { name: /Otro título de prueba/ }));

    expect((await screen.findByTestId("catalogue-detail-pane")).textContent).toContain(
      "Otro título de prueba",
    );
    expect(actionMocks.getBookById).toHaveBeenCalledWith(secondBook.id);
    expect(window.location.search).toBe(`?book=${secondBook.id}`);
  });

  it("opens the real pane for a book selected by the URL", () => {
    window.history.replaceState(null, "", `/?book=${detailedBook.id}`);

    renderCatalogue(initialPage, detailedBook);

    expect(screen.getByTestId("catalogue-detail-pane")).not.toBeNull();
    expect(screen.getByRole("img", { name: /Portada generada/ })).not.toBeNull();
    expect(screen.getByRole("heading", { name: detailedBook.title })).not.toBeNull();
    expect(screen.getByText("Ejemplares")).not.toBeNull();
    expect(screen.getByText("CAT001.1")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Solicitar préstamo" })).not.toBeNull();
  });

  it("moves selection with arrows and opens the full page on Enter", async () => {
    renderCatalogue({ ...initialPage, items: [initialPage.items[0], secondBook], total: 2 });

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(
      screen.getByRole("option", { name: /Otro título de prueba/ }).getAttribute("aria-selected"),
    ).toBe("true");
    await waitFor(() => expect(actionMocks.getBookById).toHaveBeenCalledWith(secondBook.id));

    fireEvent.keyDown(window, { key: "Enter" });
    expect(routerMocks.push).toHaveBeenCalledWith(`/books/${secondBook.id}`);
  });

  it("closes the detail pane with Escape", async () => {
    renderCatalogue();
    fireEvent.click(screen.getByRole("option", { name: /Un título de prueba/ }));
    expect(await screen.findByTestId("catalogue-detail-pane")).not.toBeNull();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("catalogue-detail-pane")).toBeNull();
  });

  it("closes a loading detail pane with Escape", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    actionMocks.getBookById.mockImplementation(
      () => new Promise((resolve) => (resolveRequest = resolve)),
    );
    renderCatalogue({ ...initialPage, items: [initialPage.items[0], secondBook], total: 2 });

    fireEvent.click(screen.getByRole("option", { name: /Otro título de prueba/ }));
    expect(screen.getByTestId("catalogue-detail-loading")).not.toBeNull();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("catalogue-detail-loading")).toBeNull();
    expect(window.location.search).toBe("");

    resolveRequest({ ok: true, value: secondDetailedBook });
  });

  it("moves the highlight without routing on a narrow viewport", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    renderCatalogue({ ...initialPage, items: [initialPage.items[0], secondBook], total: 2 });

    fireEvent.keyDown(window, { key: "ArrowDown" });

    expect(
      screen.getByRole("option", { name: /Otro título de prueba/ }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(actionMocks.getBookById).not.toHaveBeenCalled();
  });

  it("resets the pane's favorite and carousel state when another book is selected", async () => {
    const imagesFor = (bookId: string) =>
      [1, 2].map((order) => ({
        id: `${bookId.slice(0, -1)}${order + 4}`,
        bookId,
        imageUrl: `/covers/${bookId}-${order}.jpg`,
        isCover: order === 1,
        altText: null,
        displayOrder: order,
        createdAt: new Date(),
      }));
    actionMocks.getBookById.mockImplementation(async (id: string) => ({
      ok: true,
      value:
        id === secondBook.id
          ? { ...secondDetailedBook, images: imagesFor(secondBook.id) }
          : { ...detailedBook, images: imagesFor(detailedBook.id) },
    }));
    render(
      <BookCatalog
        initialPage={{ ...initialPage, items: [initialPage.items[0], secondBook], total: 2 }}
        initialFilters={{}}
        facets={facets}
        staff={false}
        counts={null}
        user={{
          id: "00000000-0000-4000-8000-000000000009",
          email: "lectora@example.com",
          name: "Lectora",
          emailVerified: true,
          role: "user",
        }}
        initialSelectedBook={null}
      />,
    );

    fireEvent.click(screen.getByRole("option", { name: /Un título de prueba/ }));
    const firstPane = await screen.findByTestId("catalogue-detail-pane");
    fireEvent.click(within(firstPane).getByRole("button", { name: "Me gusta (0)" }));
    expect(await within(firstPane).findByRole("button", { name: "Te gusta (1)" })).not.toBeNull();
    fireEvent.click(within(firstPane).getByRole("button", { name: "Siguiente" }));
    expect(within(firstPane).getByText("2 / 2")).not.toBeNull();

    fireEvent.click(screen.getByRole("option", { name: /Otro título de prueba/ }));

    await waitFor(() =>
      expect(
        within(screen.getByTestId("catalogue-detail-pane")).getByRole("heading", { level: 1 })
          .textContent,
      ).toBe("Otro título de prueba"),
    );
    const secondPane = screen.getByTestId("catalogue-detail-pane");
    expect(within(secondPane).getByRole("button", { name: "Me gusta (0)" })).not.toBeNull();
    expect(within(secondPane).getByText("1 / 2")).not.toBeNull();
  });

  it("moves the grid highlight with arrows without opening the pane", () => {
    renderCatalogue({ ...initialPage, items: [initialPage.items[0], secondBook], total: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Vista de cuadrícula" }));

    fireEvent.keyDown(window, { key: "ArrowDown" });

    const cards = screen.getAllByRole("listitem");
    expect(cards[1].className).toContain("ring-2");
    expect(actionMocks.getBookById).not.toHaveBeenCalled();
    expect(screen.queryByTestId("catalogue-detail-pane")).toBeNull();
    expect(screen.queryByTestId("catalogue-detail-loading")).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("shows a URL book from another page without highlighting a row", () => {
    const offPageBook = {
      ...detailedBook,
      id: "00000000-0000-4000-8000-000000000008",
      title: "Un título de otra página",
    } satisfies BookDetailed;
    window.history.replaceState(null, "", `/?book=${offPageBook.id}`);

    renderCatalogue(
      { ...initialPage, items: [initialPage.items[0], secondBook], total: 2 },
      offPageBook,
    );

    expect(
      within(screen.getByTestId("catalogue-detail-pane")).getByRole("heading", { level: 1 })
        .textContent,
    ).toBe("Un título de otra página");
    expect(
      within(screen.getByRole("listbox", { name: "Libros" })).queryByRole("option", {
        selected: true,
      }),
    ).toBeNull();
  });

  it("keeps the selected book in the URL when a filter request settles", async () => {
    actionMocks.getBooks.mockResolvedValue({ ok: true, value: initialPage });
    renderCatalogue({ ...initialPage, items: [initialPage.items[0], secondBook], total: 2 });

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar" }), {
      target: { value: "física" },
    });
    fireEvent.click(screen.getByRole("option", { name: /Otro título de prueba/ }));

    await waitFor(() => expect(actionMocks.getBooks).toHaveBeenCalled());
    expect(window.location.search).toContain(`book=${secondBook.id}`);
  });
});
