// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Actions from "../actions";
import type { LendableCopy } from "../types";
import { RequestActions } from "./request-actions";

const mocks = vi.hoisted(() => ({
  approveRequest: vi.fn<typeof Actions.approveRequest>(),
  rejectRequest: vi.fn<typeof Actions.rejectRequest>(),
  refresh: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../actions", () => ({
  approveRequest: mocks.approveRequest,
  rejectRequest: mocks.rejectRequest,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const copy: LendableCopy = {
  id: "copy-1",
  number: 1,
  code: "CAFG01.1",
  volume: null,
  location: null,
};

const requestId = "00000000-0000-4000-8000-000000000001";

function renderActions(copies: LendableCopy[] = [copy]) {
  return render(
    <RequestActions requestId={requestId} title="Mecánica" reader="Ana" copies={copies} />,
  );
}

const refusal = { ok: false, error: { code: "failed", message: "El ejemplar ya no está libre." } };

beforeEach(() => {
  mocks.approveRequest.mockReset();
  mocks.rejectRequest.mockReset();
  mocks.refresh.mockReset();
  mocks.toast.mockReset();
});
afterEach(cleanup);

describe("RequestActions", () => {
  it("approves the copy that was chosen and confirms with a toast", async () => {
    mocks.approveRequest.mockResolvedValue({ ok: true, value: undefined as never });
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Aprobar Mecánica para Ana" }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Aprobado: CAFG01.1",
        description: "Mecánica",
      }),
    );
    expect(mocks.approveRequest).toHaveBeenCalledWith({ requestId, copyId: "copy-1" });
  });

  it("shows a refused approval above the buttons and keeps them", async () => {
    mocks.approveRequest.mockResolvedValue(
      refusal as Awaited<ReturnType<typeof Actions.approveRequest>>,
    );
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Aprobar Mecánica para Ana" }));

    expect((await screen.findByRole("alert")).textContent).toBe("El ejemplar ya no está libre.");
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Aprobar Mecánica para Ana" })).toBeTruthy();
  });

  it("says why a request cannot be approved when no copy is free", () => {
    renderActions([]);

    expect(screen.getByText("Sin ejemplares libres")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Aprobar/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Rechazar Mecánica de Ana" })).toBeTruthy();
  });

  it("asks for a reason before rejecting and shows the empty one on the field", () => {
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Rechazar Mecánica de Ana" }));
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    const reason = screen.getByLabelText(/^Motivo/);
    expect(screen.getByRole("alert").textContent).toBe("El motivo no puede estar vacío");
    expect(reason.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(reason);
    expect(mocks.rejectRequest).not.toHaveBeenCalled();
  });

  it("sends the reason the librarian wrote", async () => {
    mocks.rejectRequest.mockResolvedValue({ ok: true, value: undefined as never });
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Rechazar Mecánica de Ana" }));
    fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: "Solo en sala" } });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Solicitud rechazada",
        description: "Mecánica",
      }),
    );
    expect(mocks.rejectRequest).toHaveBeenCalledWith({ requestId, reason: "Solo en sala" });
  });

  it("shows a refused rejection on the reason field and leaves the form open", async () => {
    mocks.rejectRequest.mockResolvedValue(
      refusal as Awaited<ReturnType<typeof Actions.rejectRequest>>,
    );
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Rechazar Mecánica de Ana" }));
    fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: "Solo en sala" } });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    expect((await screen.findByRole("alert")).textContent).toBe("El ejemplar ya no está libre.");
    expect((screen.getByLabelText(/^Motivo/) as HTMLInputElement).value).toBe("Solo en sala");
  });
});
