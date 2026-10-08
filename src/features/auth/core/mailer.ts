import { getCloudflareContext } from "@opennextjs/cloudflare";

const SEND_TIMEOUT_MS = 10_000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

interface MailOptions {
  /** Defaults to the `RESEND_API_KEY` secret. */
  apiKey?: string | null;
  /** Defaults to the `MAIL_FROM` variable. */
  from?: string | null;
  production?: boolean;
  timeoutMs?: number;
  endpoint?: string;
}

interface Message {
  to: string;
  subject: string;
  text: string;
}

export function sendVerificationEmail(
  email: string,
  code: string,
  options?: MailOptions,
): Promise<void> {
  return sendMail(
    {
      to: email,
      subject: "Tu código de verificación",
      text: `Tu código de verificación es ${code}. Expira en 10 minutos.`,
    },
    options,
  );
}

export function sendPasswordResetEmail(
  email: string,
  code: string,
  options?: MailOptions,
): Promise<void> {
  return sendMail(
    {
      to: email,
      subject: "Restablece tu contraseña",
      text: `Tu código para restablecer la contraseña es ${code}. Expira en 10 minutos.`,
    },
    options,
  );
}

/** An omitted option falls back to the Worker's secret or variable. `null` disables that fallback. */
async function resolveOptions(options: MailOptions) {
  let { apiKey, from } = options;
  if (apiKey === undefined || from === undefined) {
    const { env } = await getCloudflareContext({ async: true });
    if (apiKey === undefined) apiKey = env.RESEND_API_KEY;
    if (from === undefined) from = env.MAIL_FROM;
  }
  return {
    apiKey,
    from,
    production: options.production ?? process.env.NODE_ENV === "production",
    timeoutMs: options.timeoutMs ?? SEND_TIMEOUT_MS,
    endpoint: options.endpoint ?? RESEND_ENDPOINT,
  };
}

function describeMissing({ apiKey, from }: Awaited<ReturnType<typeof resolveOptions>>) {
  const missing = [!apiKey && "RESEND_API_KEY", !from && "MAIL_FROM"].filter(Boolean);
  return missing.length > 0 ? `Cannot send email: ${missing.join(" and ")} not set.` : null;
}

/** Include Resend's response, but never the request, which carries the API key. */
async function describeRejection(response: Response) {
  const body = await response.text().catch(() => "");
  let detail = body.slice(0, 200);
  try {
    const { message } = JSON.parse(body) as { message?: unknown };
    if (typeof message === "string") detail = message;
  } catch {
    // Keep the response text when Resend does not return JSON.
  }
  return `Resend rejected the email (${response.status})${detail ? `: ${detail}` : "."}`;
}

/**
 * Why mail cannot be sent in production, or null when it can or when the environment only logs
 * codes. Lets a caller refuse a request up front instead of discovering it after the send.
 */
export async function mailUnavailableReason(options: MailOptions = {}): Promise<string | null> {
  const config = await resolveOptions(options);
  return config.production ? describeMissing(config) : null;
}

async function sendMail(message: Message, options: MailOptions = {}): Promise<void> {
  const config = await resolveOptions(options);
  const { apiKey, from, production, timeoutMs, endpoint } = config;

  if (apiKey && from) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(await describeRejection(response));
    return;
  }

  if (production) throw new Error(describeMissing(config) ?? "Cannot send email.");

  console.log(`[email] To ${message.to}: ${message.text}`);
}
