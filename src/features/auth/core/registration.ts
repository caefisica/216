import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { Ok, Err, type Result } from "@/lib/result";
import { createUser, type AuthUser } from "./session";
import { issueEmailVerification, sendVerificationEmailBucket } from "./email-verification";
import type { EmailVerificationRequest } from "./email-verification";
import type { sendVerificationEmail } from "./mailer";

/** Creates the account and mails its first code. The account is deleted if the mail fails. */
export async function registerUser(
  input: { email: string; name: string; password: string },
  send?: typeof sendVerificationEmail,
): Promise<Result<{ user: AuthUser; request: EmailVerificationRequest }, "mail_failed">> {
  const user = await createUser(input.email, input.name, input.password);
  sendVerificationEmailBucket.consume(user.id, 1);

  const request = await issueEmailVerification(user.id, user.email, send);
  if (!request.ok) {
    const db = await getDb();
    await db.delete(userTable).where(eq(userTable.id, user.id));
    return Err("mail_failed");
  }
  return Ok({ user, request: request.value });
}
