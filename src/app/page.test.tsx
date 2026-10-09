// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import HomePage from "./page";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getVerifiedUserId: vi.fn(),
  isVerifiedStaff: vi.fn(),
}));
const serviceMocks = vi.hoisted(() => ({
  getBookByIdService: vi.fn(),
  getBooksService: vi.fn(),
  getFacetsService: vi.fn(),
}));
const repositoryMocks = vi.hoisted(() => ({
  getLibraryCounts: vi.fn(),
  getLoanCounts: vi.fn(),
}));
vi.mock("@/features/auth/protected-action", () => authMocks);
vi.mock("@/features/books/service", () => serviceMocks);
vi.mock("@/features/readers/repository", () => repositoryMocks);
vi.mock("@/features/loans/repository", () => ({ getLoanCounts: repositoryMocks.getLoanCounts }));
vi.mock("@/features/books/components/book-catalog", () => ({
  BookCatalog: () => null,
}));
vi.mock("@/features/admin/components/admin-dashboard", () => ({
  AdminDashboard: () => null,
}));

const selectedBook = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Un título de prueba",
};

describe("home catalogue selection", () => {
  beforeEach(() => {
    authMocks.getSession.mockResolvedValue({ user: null });
    authMocks.getVerifiedUserId.mockResolvedValue(null);
    authMocks.isVerifiedStaff.mockReturnValue(false);
    serviceMocks.getBooksService.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 });
    serviceMocks.getFacetsService.mockResolvedValue({
      categories: [],
      cabinets: [],
      donors: [],
      copyHealth: { present: 0, maintenance: 0, missing: 0, unlabelled: 0, unplaced: 0 },
    });
    serviceMocks.getBookByIdService.mockResolvedValue({ ok: true, value: selectedBook });
    repositoryMocks.getLibraryCounts.mockResolvedValue(null);
    repositoryMocks.getLoanCounts.mockResolvedValue({ pending: 0, overdue: 0 });
  });

  it("loads the URL book and passes it to the catalogue pane", async () => {
    const page = (await HomePage({
      searchParams: Promise.resolve({ book: selectedBook.id }),
    })) as ReactElement<{
      children: ReactElement<{ initialSelectedBook: unknown }>;
    }>;
    const catalogue = page.props.children;

    expect(serviceMocks.getBookByIdService).toHaveBeenCalledWith(selectedBook.id, null);
    expect(catalogue.props.initialSelectedBook).toBe(selectedBook);
  });
});
