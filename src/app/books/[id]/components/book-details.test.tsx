// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BookDetailed } from "@/features/books/types";
import { BookDetails } from "./book-details";

vi.mock("@/features/books/actions", () => ({ updateCopy: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn(), toastActionError: vi.fn() }));

const book = {
  id: "00000000-0000-4000-8000-000000000001",
  code: "CAT001",
  title: "Un título de prueba",
  author: null,
  isbn: null,
  description: null,
  imageUrl: null,
  categoryId: "00000000-0000-4000-8000-000000000002",
  search: "un titulo de prueba",
  titleKey: "un titulo de prueba",
  nextCopy: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: {
    id: "00000000-0000-4000-8000-000000000002",
    code: "CAT",
    name: "Ciencia",
    parent: null,
  },
  images: [],
  copies: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      bookId: "00000000-0000-4000-8000-000000000001",
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

describe("BookDetails", () => {
  afterEach(() => cleanup());

  it("uses singular Spanish for one available copy", () => {
    render(<BookDetails book={book} canEdit={false} />);

    expect(screen.getByText("1 disponible de 1")).not.toBeNull();
  });
});
