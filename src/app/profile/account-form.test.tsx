// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Actions from "@/features/users/actions";
import { AccountForm } from "./account-form";

const mocks = vi.hoisted(() => ({
  updateUserProfile: vi.fn<typeof Actions.updateUserProfile>(),
  refresh: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/features/users/actions", () => ({ updateUserProfile: mocks.updateUserProfile }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

beforeEach(() => {
  mocks.updateUserProfile.mockReset();
  mocks.refresh.mockReset();
  mocks.toast.mockReset();
});
afterEach(cleanup);

const user = {
  id: "u1",
  email: "ana@unmsm.edu.pe",
  name: "Ana María",
  emailVerified: true,
  role: "user",
  createdAt: new Date(),
} as const;

const nameField = () => screen.getByLabelText(/^Nombre/) as HTMLInputElement;
const save = () => screen.getByRole("button", { name: /Guardar/ }) as HTMLButtonElement;

describe("AccountForm", () => {
  it("keeps Guardar off until the name changes", () => {
    render(<AccountForm name="Ana" email="ana@unmsm.edu.pe" />);

    expect(save().disabled).toBe(true);

    fireEvent.change(nameField(), { target: { value: "Ana María" } });

    expect(save().disabled).toBe(false);
  });

  it("confirms a saved name with a toast and refreshes the page", async () => {
    mocks.updateUserProfile.mockResolvedValue({ ok: true, value: user });
    render(<AccountForm name="Ana" email="ana@unmsm.edu.pe" />);

    fireEvent.change(nameField(), { target: { value: "Ana María" } });
    fireEvent.click(save());

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: "Nombre guardado" }));
    expect(mocks.updateUserProfile).toHaveBeenCalledWith({ name: "Ana María" });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows a refused name next to the field and clears it on the next edit", async () => {
    mocks.updateUserProfile.mockResolvedValue({
      ok: false,
      error: { code: "invalid", message: "El nombre es demasiado largo." },
    });
    render(<AccountForm name="Ana" email="ana@unmsm.edu.pe" />);

    fireEvent.change(nameField(), { target: { value: "Ana María" } });
    fireEvent.click(save());

    await waitFor(() => expect(screen.getByText("El nombre es demasiado largo.")).toBeTruthy());
    expect(nameField().getAttribute("aria-invalid")).toBe("true");
    expect(mocks.toast).not.toHaveBeenCalled();

    fireEvent.change(nameField(), { target: { value: "Ana M" } });

    expect(screen.queryByText("El nombre es demasiado largo.")).toBeNull();
  });
});
