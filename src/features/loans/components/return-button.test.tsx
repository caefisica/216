// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Actions from "../actions";
import { ReturnButton } from "./return-button";

const mocks = vi.hoisted(() => ({
  returnLoan: vi.fn<typeof Actions.returnLoan>(),
  reopenLoan: vi.fn<typeof Actions.reopenLoan>(),
  refresh: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../actions", () => ({ returnLoan: mocks.returnLoan, reopenLoan: mocks.reopenLoan }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
afterEach(cleanup);

describe("ReturnButton", () => {
  it("shows a refused return under the button and leaves the loan open", async () => {
    mocks.returnLoan.mockResolvedValue({
      ok: false,
      error: { code: "failed", message: "El préstamo ya fue devuelto." },
    });
    render(<ReturnButton requestId="r1" title="Mecánica" reader="Ana" />);

    fireEvent.click(screen.getByRole("button", { name: "Devolver Mecánica de Ana" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("El préstamo ya fue devuelto."),
    );
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: "Devolver Mecánica de Ana" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
