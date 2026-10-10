// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Actions from "../actions";
import type { BookImage } from "../types";
import { ImageManager } from "./image-manager";

const mocks = vi.hoisted(() => ({
  uploadBookImage: vi.fn<typeof Actions.uploadBookImage>(),
  addBookImage: vi.fn<typeof Actions.addBookImage>(),
  setCoverImage: vi.fn<typeof Actions.setCoverImage>(),
  deleteBookImage: vi.fn<typeof Actions.deleteBookImage>(),
  refresh: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../actions", () => ({
  uploadBookImage: mocks.uploadBookImage,
  addBookImage: mocks.addBookImage,
  setCoverImage: mocks.setCoverImage,
  deleteBookImage: mocks.deleteBookImage,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const bookId = "00000000-0000-4000-8000-000000000003";
const image: BookImage = {
  id: "00000000-0000-4000-8000-000000000004",
  bookId,
  imageUrl: "/covers/a.jpg",
  altText: null,
  isCover: false,
  displayOrder: 0,
  createdAt: new Date(),
};

const refusal = (message: string) => ({
  ok: false as const,
  error: { code: "failed" as const, message },
});

function fileInput(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>('input[type="file"]')!;
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
afterEach(cleanup);

describe("ImageManager", () => {
  it("shows a refused upload above the dropzone", async () => {
    mocks.uploadBookImage.mockResolvedValue(refusal("No se pudo guardar la imagen."));
    const { container } = render(<ImageManager bookId={bookId} images={[]} />);

    fireEvent.change(fileInput(container), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("No se pudo guardar la imagen."),
    );
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("names a rejected file type next to the dropzone, without a success toast", async () => {
    const { container } = render(<ImageManager bookId={bookId} images={[]} />);

    fireEvent.change(fileInput(container), {
      target: { files: [new File(["x"], "a.txt", { type: "text/plain" })] },
    });

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Archivo rechazado"),
    );
    expect(mocks.uploadBookImage).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("shows a refused cover change and a refused removal", async () => {
    mocks.setCoverImage.mockResolvedValue(refusal("La foto ya no existe."));
    mocks.deleteBookImage.mockResolvedValue(refusal("No se pudo quitar la foto."));
    render(<ImageManager bookId={bookId} images={[image]} />);

    fireEvent.click(screen.getByRole("button", { name: "Usar de portada" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("La foto ya no existe."),
    );

    fireEvent.click(screen.getByRole("button", { name: /^Quitar/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("No se pudo quitar la foto."),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
