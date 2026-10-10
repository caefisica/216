// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";
import NotFound from "./not-found";

afterEach(cleanup);

describe("a page that fails or is missing", () => {
  it("is headed by the failure and offers another try", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("boom")} reset={reset} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Algo salió mal");

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("is headed by what is missing and leads back to the catalogue", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Esta página no existe");
    expect(screen.getByRole("link", { name: "Buscar en el catálogo" }).getAttribute("href")).toBe(
      "/",
    );
  });
});
