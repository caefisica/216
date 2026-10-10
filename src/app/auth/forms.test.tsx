// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as SignIn from "@/features/auth/actions/signin";
import type * as SignUp from "@/features/auth/actions/signup";
import SignInPage from "./signin/page";
import SignUpPage from "./signup/page";

const actions = vi.hoisted(() => ({
  signInAction: vi.fn<typeof SignIn.signInAction>(),
  signUpAction: vi.fn<typeof SignUp.signUpAction>(),
}));

vi.mock("@/features/auth/actions/signin", () => ({ signInAction: actions.signInAction }));
vi.mock("@/features/auth/actions/signup", () => ({ signUpAction: actions.signUpAction }));

beforeEach(() => {
  actions.signInAction.mockReset();
  actions.signUpAction.mockReset();
});
afterEach(cleanup);

// A field's label also carries its hint, so match the start of it.
const field = (label: string) => screen.getByLabelText(new RegExp(`^${label}`)) as HTMLInputElement;

describe("sign in", () => {
  it("shows the refusal and keeps the email so a typo is one edit away", async () => {
    actions.signInAction.mockResolvedValue({ error: "Credenciales inválidas." });
    render(<SignInPage />);

    fireEvent.change(field("Correo"), { target: { value: "ana@unmsm.edu.pe" } });
    fireEvent.change(field("Contraseña"), { target: { value: "incorrecta" } });
    await act(async () => {
      fireEvent.submit(field("Correo").form!);
    });

    expect(screen.getByRole("alert").textContent).toContain("Credenciales inválidas.");
    expect(field("Correo").value).toBe("ana@unmsm.edu.pe");
    expect(field("Contraseña").value).toBe("");
  });

  it("sends what was typed to the action", async () => {
    actions.signInAction.mockResolvedValue(null);
    render(<SignInPage />);

    fireEvent.change(field("Correo"), { target: { value: "ana@unmsm.edu.pe" } });
    fireEvent.change(field("Contraseña"), { target: { value: "secreta123" } });
    await act(async () => {
      fireEvent.submit(field("Correo").form!);
    });

    const sent = actions.signInAction.mock.calls[0]![1];
    expect(sent.get("email")).toBe("ana@unmsm.edu.pe");
    expect(sent.get("password")).toBe("secreta123");
  });
});

describe("sign up", () => {
  it("keeps the name and email when the account is refused", async () => {
    actions.signUpAction.mockResolvedValue({ error: "Ese correo ya tiene una cuenta." });
    render(<SignUpPage />);

    fireEvent.change(field("Nombre"), { target: { value: "Ana Gutiérrez" } });
    fireEvent.change(field("Correo"), { target: { value: "ana@unmsm.edu.pe" } });
    fireEvent.change(field("Contraseña"), { target: { value: "secreta123" } });
    await act(async () => {
      fireEvent.submit(field("Correo").form!);
    });

    expect(screen.getByRole("alert").textContent).toContain("Ese correo ya tiene una cuenta.");
    expect(field("Nombre").value).toBe("Ana Gutiérrez");
    expect(field("Correo").value).toBe("ana@unmsm.edu.pe");
  });
});
