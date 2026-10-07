import { getCloudflareContext } from "@opennextjs/cloudflare";

const SEND_TIMEOUT_MS = 10_000;

interface MailOptions {
  /** Defaults to the `EMAIL` binding. */
  binding?: Pick<SendEmail, "send"> | null;
  /** Defaults to the `MAIL_FROM` variable. */
  from?: string | null;
  production?: boolean;
  timeoutMs?: number;
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

/** An option left `undefined` falls back to the Worker's binding or variable. `null` means none. */
async function resolveOptions(options: MailOptions) {
  let { binding, from } = options;
  if (binding === undefined || from === undefined) {
    const { env } = await getCloudflareContext({ async: true });
    if (binding === undefined) binding = env.EMAIL;
    if (from === undefined) from = env.MAIL_FROM;
  }
  return {
    binding,
    from,
    production: options.production ?? process.env.NODE_ENV === "production",
    timeoutMs: options.timeoutMs ?? SEND_TIMEOUT_MS,
  };
}

function describeMissing({ binding, from }: Awaited<ReturnType<typeof resolveOptions>>) {
  const missing = [!binding && "the EMAIL binding", !from && "MAIL_FROM"].filter(Boolean);
  return missing.length > 0 ? `Cannot send email: ${missing.join(" and ")} not set.` : null;
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
  const { binding, from, production, timeoutMs } = config;

  if (binding && from) {
    const timeout = AbortSignal.timeout(timeoutMs);
    await Promise.race([
      binding.send({ from, ...message }),
      new Promise<never>((_, reject) =>
        timeout.addEventListener("abort", () => reject(timeout.reason)),
      ),
    ]);
    return;
  }

  if (production) throw new Error(describeMissing(config) ?? "Cannot send email.");

  console.log(`[email] To ${message.to}: ${message.text}`);
}
