// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Actions from "../actions";
import type { User } from "../types";
import { UserRoles } from "./user-roles";

const mocks = vi.hoisted(() => ({
  updateUserRole: vi.fn<typeof Actions.updateUserRole>(),
  refresh: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../actions", () => ({ updateUserRole: mocks.updateUserRole }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const person = (id: string, name: string): User => ({
  id,
  name,
  email: `${id}@unmsm.edu.pe`,
  emailVerified: true,
  role: "user",
  createdAt: new Date(),
});
const users = [person("ana", "Ana"), person("beto", "Beto")];

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});
afterEach(cleanup);

describe("UserRoles", () => {
  it("shows a refused role change in that person's row only", async () => {
    mocks.updateUserRole.mockResolvedValue({
      ok: false,
      error: { code: "forbidden", message: "No puedes cambiar ese rol." },
    });
    render(<UserRoles users={users} selfId="root" />);

    fireEvent.change(screen.getByLabelText("Rol de Beto"), { target: { value: "librarian" } });

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    const row = screen.getByText("Beto").closest("li")!;
    expect(within(row).getByRole("alert").textContent).toContain("No puedes cambiar ese rol.");
    expect(within(screen.getByText("Ana").closest("li")!).queryByRole("alert")).toBeNull();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
