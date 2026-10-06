const RESEND_URL = "https://api.resend.com/emails";

const SEND_TIMEOUT_MS = 10_000;

interface MailOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
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

async function sendMail(
  message: Message,
  { env = process.env, fetchImpl = fetch, timeoutMs = SEND_TIMEOUT_MS }: MailOptions = {},
): Promise<void> {
  const { RESEND_API_KEY: apiKey, MAIL_FROM: from } = env;

  if (apiKey && from) {
    const response = await fetchImpl(RESEND_URL, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Mail provider rejected the email (HTTP ${response.status}).`);
    }
    return;
  }

  if (env.NODE_ENV === "production") {
    const missing = [!apiKey && "RESEND_API_KEY", !from && "MAIL_FROM"].filter(Boolean).join(", ");
    throw new Error(`Cannot send email: ${missing} not set.`);
  }

  console.log(`[email] To ${message.to}: ${message.text}`);
}
