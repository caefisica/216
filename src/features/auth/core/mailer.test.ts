import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mailUnavailableReason, sendPasswordResetEmail, sendVerificationEmail } from "./mailer";

const from = "onboarding@resend.dev";
const apiKey = "re_test_key";

interface Received {
  method?: string;
  headers: IncomingMessage["headers"];
  body: Record<string, unknown>;
}

type Reply = { status: number; body: string } | "hang";

const received: Received[] = [];
let reply: Reply = { status: 200, body: JSON.stringify({ id: "id" }) };
let server: Server;
let endpoint: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      received.push({ method: request.method, headers: request.headers, body: JSON.parse(raw) });
      if (reply === "hang") return;
      response.writeHead(reply.status, { "Content-Type": "application/json" });
      response.end(reply.body);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/emails`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

afterEach(() => {
  received.length = 0;
  reply = { status: 200, body: JSON.stringify({ id: "id" }) };
});

describe("sendVerificationEmail", () => {
  it("posts the message to Resend with the key, in any environment", async () => {
    for (const production of [false, true]) {
      received.length = 0;
      await sendVerificationEmail("a@b.pe", "123456", { apiKey, from, production, endpoint });

      expect(received).toHaveLength(1);
      const [request] = received;
      expect(request.method).toBe("POST");
      expect(request.headers.authorization).toBe(`Bearer ${apiKey}`);
      expect(request.headers["content-type"]).toBe("application/json");
      expect(request.body).toEqual({
        from,
        to: ["a@b.pe"],
        subject: "Tu código de verificación",
        text: "Tu código de verificación es 123456. Expira en 10 minutos.",
      });
    }
  });

  it("only logs the code in development when unconfigured", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendVerificationEmail("a@b.pe", "123456", {
      apiKey: null,
      from: "",
      production: false,
      endpoint,
    });

    expect(log).toHaveBeenCalledWith(expect.stringContaining("123456"));
    expect(received).toHaveLength(0);
    log.mockRestore();
  });

  it("fails loudly in production without the key, without logging the code or calling Resend", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      sendVerificationEmail("a@b.pe", "123456", { apiKey: null, from, production: true, endpoint }),
    ).rejects.toThrow("Cannot send email: RESEND_API_KEY not set.");

    expect(log).not.toHaveBeenCalled();
    expect(received).toHaveLength(0);
    log.mockRestore();
  });

  it("fails loudly in production without a sender", async () => {
    await expect(
      sendVerificationEmail("a@b.pe", "123456", { apiKey, from: "", production: true, endpoint }),
    ).rejects.toThrow("Cannot send email: MAIL_FROM not set.");
    expect(received).toHaveLength(0);
  });

  it("throws with Resend's status and message when it rejects the message", async () => {
    reply = {
      status: 403,
      body: JSON.stringify({
        statusCode: 403,
        name: "validation_error",
        message: "You can only send testing emails to your own email address.",
      }),
    };

    const failure = sendVerificationEmail("a@b.pe", "123456", {
      apiKey,
      from,
      production: true,
      endpoint,
    });

    await expect(failure).rejects.toThrow(
      "Resend rejected the email (403): You can only send testing emails to your own email address.",
    );
    await failure.catch((error: Error) => {
      expect(error.message).not.toContain(apiKey);
      expect(error.message).not.toContain("123456");
    });
  });

  it("throws on a rejection that is not JSON", async () => {
    reply = { status: 502, body: "Bad Gateway" };

    await expect(
      sendVerificationEmail("a@b.pe", "123456", { apiKey, from, production: true, endpoint }),
    ).rejects.toThrow("Resend rejected the email (502): Bad Gateway");
  });

  it("gives up when Resend does not answer in time", async () => {
    reply = "hang";

    await expect(
      sendVerificationEmail("a@b.pe", "123456", { apiKey, from, endpoint, timeoutMs: 50 }),
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

  it("falls back to RESEND_API_KEY and MAIL_FROM of the Worker for options left undefined", async () => {
    setWorkerEnv({ RESEND_API_KEY: "re_worker_key", MAIL_FROM: from });

    await sendVerificationEmail("a@b.pe", "123456", { production: true, endpoint });

    expect(received[0].headers.authorization).toBe("Bearer re_worker_key");
    expect(received[0].body).toMatchObject({ to: ["a@b.pe"], from });
  });

  it("fails in production when the Worker has no RESEND_API_KEY", async () => {
    setWorkerEnv({ MAIL_FROM: from });

    await expect(
      sendVerificationEmail("a@b.pe", "123456", { production: true, endpoint }),
    ).rejects.toThrow("Cannot send email: RESEND_API_KEY not set.");
    expect(received).toHaveLength(0);
  });

  it("fails in production when the Worker has an empty MAIL_FROM", async () => {
    setWorkerEnv({ RESEND_API_KEY: apiKey, MAIL_FROM: "" });

    await expect(
      sendVerificationEmail("a@b.pe", "123456", { production: true, endpoint }),
    ).rejects.toThrow("Cannot send email: MAIL_FROM not set.");
  });
});

describe("mailUnavailableReason", () => {
  it("names what is missing in production", async () => {
    expect(await mailUnavailableReason({ apiKey, from: "", production: true })).toBe(
      "Cannot send email: MAIL_FROM not set.",
    );
    expect(await mailUnavailableReason({ apiKey: null, from, production: true })).toBe(
      "Cannot send email: RESEND_API_KEY not set.",
    );
    expect(await mailUnavailableReason({ apiKey: null, from: "", production: true })).toBe(
      "Cannot send email: RESEND_API_KEY and MAIL_FROM not set.",
    );
  });

  it("is null when mail is configured, and in development where codes are logged", async () => {
    expect(await mailUnavailableReason({ apiKey, from, production: true })).toBeNull();
    expect(await mailUnavailableReason({ apiKey: null, from: "", production: false })).toBeNull();
  });
});

describe("sendPasswordResetEmail", () => {
  it("posts the reset code to Resend", async () => {
    await sendPasswordResetEmail("a@b.pe", "654321", { apiKey, from, endpoint });

    expect(received[0].body).toEqual({
      from,
      to: ["a@b.pe"],
      subject: "Restablece tu contraseña",
      text: "Tu código para restablecer la contraseña es 654321. Expira en 10 minutos.",
    });
  });

  it("fails loudly in production when unconfigured and logs only in development", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const unconfigured = { apiKey: null, from: "", endpoint };

    await expect(
      sendPasswordResetEmail("a@b.pe", "654321", { ...unconfigured, production: true }),
    ).rejects.toThrow(/RESEND_API_KEY/);
    expect(log).not.toHaveBeenCalled();

    await sendPasswordResetEmail("a@b.pe", "654321", { ...unconfigured, production: false });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("654321"));
    expect(received).toHaveLength(0);
    log.mockRestore();
  });
});
