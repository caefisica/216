import { afterEach, describe, expect, it, vi } from "vitest";
import { mailUnavailableReason, sendPasswordResetEmail, sendVerificationEmail } from "./mailer";

const from = "216 <no-reply@example.com>";

function recordingBinding() {
  const sent: Record<string, unknown>[] = [];
  const binding = {
    send: async (message: unknown) => {
      sent.push(message as Record<string, unknown>);
      return { messageId: "id" };
    },
  } as never;
  return { sent, binding };
}

describe("sendVerificationEmail", () => {
  it("sends through the binding when configured, in any environment", async () => {
    for (const production of [false, true]) {
      const { sent, binding } = recordingBinding();
      await sendVerificationEmail("a@b.pe", "123456", { binding, from, production });

      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ to: "a@b.pe", from });
      expect(sent[0].text).toContain("123456");
    }
  });

  it("only logs the code in development when unconfigured", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendVerificationEmail("a@b.pe", "123456", {
      binding: null,
      from: "",
      production: false,
    });

    expect(log).toHaveBeenCalledWith(expect.stringContaining("123456"));
    log.mockRestore();
  });

  it("fails loudly in production when unconfigured, without logging the code", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { binding } = recordingBinding();

    await expect(
      sendVerificationEmail("a@b.pe", "123456", { binding, from: "", production: true }),
    ).rejects.toThrow(/MAIL_FROM/);

    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("throws when the provider rejects the message", async () => {
    const binding = {
      send: async () => {
        throw new Error("sender domain not verified");
      },
    } as never;

    await expect(
      sendVerificationEmail("a@b.pe", "123456", { binding, from, production: true }),
    ).rejects.toThrow(/not verified/);
  });

  it("gives up when the provider does not answer in time", async () => {
    const binding = { send: () => new Promise(() => {}) } as never;

    await expect(
      sendVerificationEmail("a@b.pe", "123456", { binding, from, timeoutMs: 50 }),
    ).rejects.toThrow();
  });
});

describe("worker settings", () => {
  const contextKey = Symbol.for("__cloudflare-context__");
  const global = globalThis as Record<symbol, unknown>;

  afterEach(() => {
    delete global[contextKey];
  });

  function setWorkerEnv(env: Record<string, unknown>) {
    global[contextKey] = { env };
  }

  it("falls back to the binding and MAIL_FROM of the Worker for options left undefined", async () => {
    const { sent, binding } = recordingBinding();
    setWorkerEnv({ EMAIL: binding, MAIL_FROM: from });

    await sendVerificationEmail("a@b.pe", "123456", {
      binding: undefined,
      from: undefined,
      production: true,
    });

    expect(sent[0]).toMatchObject({ to: "a@b.pe", from });
  });

  it("fails in production when the Worker has an empty MAIL_FROM", async () => {
    const { binding } = recordingBinding();
    setWorkerEnv({ EMAIL: binding, MAIL_FROM: "" });

    await expect(sendVerificationEmail("a@b.pe", "123456", { production: true })).rejects.toThrow(
      "Cannot send email: MAIL_FROM not set.",
    );
  });
});

describe("mailUnavailableReason", () => {
  it("names what is missing in production", async () => {
    const { binding } = recordingBinding();

    expect(await mailUnavailableReason({ binding, from: "", production: true })).toBe(
      "Cannot send email: MAIL_FROM not set.",
    );
    expect(await mailUnavailableReason({ binding: null, from: "", production: true })).toBe(
      "Cannot send email: the EMAIL binding and MAIL_FROM not set.",
    );
  });

  it("is null when mail is configured, and in development where codes are logged", async () => {
    const { binding } = recordingBinding();

    expect(await mailUnavailableReason({ binding, from, production: true })).toBeNull();
    expect(await mailUnavailableReason({ binding: null, from: "", production: false })).toBeNull();
  });
});

describe("sendPasswordResetEmail", () => {
  it("sends the reset code through the binding when configured", async () => {
    const { sent, binding } = recordingBinding();
    await sendPasswordResetEmail("a@b.pe", "654321", { binding, from });

    expect(sent[0]).toMatchObject({ to: "a@b.pe" });
    expect(sent[0].text).toContain("654321");
  });

  it("fails loudly in production when unconfigured and logs only in development", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const unconfigured = { binding: null, from: "" };

    await expect(
      sendPasswordResetEmail("a@b.pe", "654321", { ...unconfigured, production: true }),
    ).rejects.toThrow(/EMAIL binding/);
    expect(log).not.toHaveBeenCalled();

    await sendPasswordResetEmail("a@b.pe", "654321", { ...unconfigured, production: false });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("654321"));
    log.mockRestore();
  });
});
