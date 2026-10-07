import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { UNEXPECTED_ERROR, UserError } from "@/lib/action";
import { authenticatedAction, staffAction } from "./protected-action";

// Session cookies need a Next.js request, so the session lookup is the only fake.
vi.mock("@/features/auth/core/session", () => ({
  getCurrentSession: async () => ({
    session: { id: "s", userId: "u", expiresAt: new Date(Date.now() + 60_000) },
    user: { id: "u", email: "u@example.com", name: "U", emailVerified: true, role: "user" },
  }),
}));

const Input = z.object({ title: z.string().min(1) });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("what a server action returns", () => {
  it("returns the handler's value as Ok", async () => {
    const action = authenticatedAction(Input, async ({ title }, { user }) => `${title}:${user.id}`);
    expect(await action({ title: "x" })).toEqual({ ok: true, value: "x:u" });
  });

  it("returns invalid input as an error value without running the handler", async () => {
    const handler = vi.fn(async () => "ran");
    const action = authenticatedAction(Input, handler);

    expect(await action({ title: "" })).toEqual({
      ok: false,
      error: { code: "invalid", message: "Los datos enviados no son válidos." },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns a UserError's message and code, which production would hide if it were thrown", async () => {
    const action = authenticatedAction(Input, async () => {
      throw new UserError("El libro no está disponible.");
    });

    expect(await action({ title: "x" })).toEqual({
      ok: false,
      error: { code: "failed", message: "El libro no está disponible." },
    });
  });

  it("replaces an unexpected error with a generic message and logs the cause", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const action = authenticatedAction(Input, async () => {
      throw new Error("D1_ERROR: no such table: secrets");
    });

    const result = await action({ title: "x" });

    expect(result).toEqual({ ok: false, error: { code: "failed", message: UNEXPECTED_ERROR } });
    expect(JSON.stringify(result)).not.toContain("secrets");
    expect(log).toHaveBeenCalledOnce();
  });

  it("refuses a role the action does not allow before it reads the input", async () => {
    const handler = vi.fn(async () => "ran");
    const action = staffAction(Input, handler);

    expect(await action("not even an object" as never)).toMatchObject({
      ok: false,
      error: { code: "forbidden", message: "No tienes permiso para hacer esto." },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
