// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Actions from "../actions";
import { DonorSettings } from "./donor-settings";
import { LocationSettings } from "./location-settings";

const mocks = vi.hoisted(() => ({
  createDonor: vi.fn<typeof Actions.createDonor>(),
  updateDonor: vi.fn<typeof Actions.updateDonor>(),
  createLocation: vi.fn<typeof Actions.createLocation>(),
  updateLocation: vi.fn<typeof Actions.updateLocation>(),
  refresh: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../actions", () => ({
  createDonor: mocks.createDonor,
  updateDonor: mocks.updateDonor,
  createLocation: mocks.createLocation,
  updateLocation: mocks.updateLocation,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const refusal = (message: string) => ({
  ok: false as const,
  error: { code: "failed" as const, message },
});

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
afterEach(cleanup);

describe("DonorSettings", () => {
  it("shows a refused donor inside the form and keeps the name", async () => {
    mocks.createDonor.mockResolvedValue(refusal("Ya existe un donante con ese nombre."));
    render(<DonorSettings donors={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar donante" }));
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Rosa" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Ya existe un donante");
    expect((screen.getByLabelText(/^Nombre/) as HTMLInputElement).value).toBe("Rosa");
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("LocationSettings", () => {
  it("shows a refused location inside the form and keeps the cabinet", async () => {
    mocks.createLocation.mockResolvedValue(refusal("Ese tramo ya existe."));
    render(<LocationSettings locations={[]} categories={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar ubicación" }));
    fireEvent.change(screen.getByLabelText(/^Mueble/), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Ese tramo ya existe."),
    );
    expect((screen.getByLabelText(/^Mueble/) as HTMLInputElement).value).toBe("A");
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
