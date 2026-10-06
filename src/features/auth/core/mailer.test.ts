import { describe, expect, it, vi } from "vitest";
import { sendPasswordResetEmail, sendVerificationEmail } from "./mailer";

const configured = { RESEND_API_KEY: "re_test", MAIL_FROM: "216 <no-reply@example.com>" };

function recordingFetch(status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response("{}", { status });
  };
  return { calls, fetchImpl };
}

describe("sendVerificationEmail", () => {
  it("sends through the provider when configured, in any environment", async () => {
    for (const NODE_ENV of ["development", "production"]) {
      const { calls, fetchImpl } = recordingFetch();
      await sendVerificationEmail("a@b.pe", "123456", {
        env: { ...configured, NODE_ENV },
        fetchImpl,
      });

      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("https://api.resend.com/emails");
      expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
        "Bearer re_test",
      );
      const body = JSON.parse(String(calls[0].init.body));
      expect(body.to).toEqual(["a@b.pe"]);
      expect(body.from).toBe(configured.MAIL_FROM);
      expect(body.text).toContain("123456");
    }
  });

  it("only logs the code in development when unconfigured", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { calls, fetchImpl } = recordingFetch();

    await sendVerificationEmail("a@b.pe", "123456", {
      env: { NODE_ENV: "development" },
      fetchImpl,
    });

    expect(calls).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("123456"));
    log.mockRestore();
  });

  it("fails loudly in production when unconfigured, without logging the code", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { calls, fetchImpl } = recordingFetch();

    await expect(
      sendVerificationEmail("a@b.pe", "123456", { env: { NODE_ENV: "production" }, fetchImpl }),
    ).rejects.toThrow(/RESEND_API_KEY/);

    expect(calls).toHaveLength(0);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("treats a half-configured provider as unconfigured", async () => {
    await expect(
      sendVerificationEmail("a@b.pe", "123456", {
        env: { NODE_ENV: "production", RESEND_API_KEY: "re_test" },
        fetchImpl: recordingFetch().fetchImpl,
      }),
    ).rejects.toThrow(/MAIL_FROM/);
  });

  it("throws when the provider rejects the message", async () => {
    await expect(
      sendVerificationEmail("a@b.pe", "123456", {
        env: { ...configured, NODE_ENV: "production" },
        fetchImpl: recordingFetch(422).fetchImpl,
      }),
    ).rejects.toThrow(/422/);
  });

  it("gives up when the provider does not answer in time", async () => {
    const hangingFetch = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });

    await expect(
      sendVerificationEmail("a@b.pe", "123456", {
        env: configured,
        fetchImpl: hangingFetch,
        timeoutMs: 50,
      }),
    ).rejects.toThrow();
  });

  it("allows the provider ten seconds by default", async () => {
    const { calls, fetchImpl } = recordingFetch();
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await sendVerificationEmail("a@b.pe", "123456", { env: configured, fetchImpl });

    expect(timeout).toHaveBeenCalledWith(10_000);
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
    timeout.mockRestore();
  });
});

describe("sendPasswordResetEmail", () => {
  it("sends the reset code through the provider when configured", async () => {
    const { calls, fetchImpl } = recordingFetch();
    await sendPasswordResetEmail("a@b.pe", "654321", { env: configured, fetchImpl });

    const body = JSON.parse(String(calls[0].init.body));
    expect(body.to).toEqual(["a@b.pe"]);
    expect(body.text).toContain("654321");
  });

  it("fails loudly in production when unconfigured and logs only in development", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { fetchImpl } = recordingFetch();

    await expect(
      sendPasswordResetEmail("a@b.pe", "654321", { env: { NODE_ENV: "production" }, fetchImpl }),
    ).rejects.toThrow(/RESEND_API_KEY/);
    expect(log).not.toHaveBeenCalled();

    await sendPasswordResetEmail("a@b.pe", "654321", {
      env: { NODE_ENV: "development" },
      fetchImpl,
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("654321"));
    log.mockRestore();
  });
});
