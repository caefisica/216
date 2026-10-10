import { getCurrentSession } from "@/features/auth/core/session";
import { redirect } from "next/navigation";
import { z } from "zod";
import { UNEXPECTED_ERROR, UserError, type ActionResult } from "@/lib/action";
import { Err, Ok } from "@/lib/result";
import type { Role } from "@/lib/db/schema";
import type { Session, AuthUser } from "@/features/auth/core/session";

export type AuthSession = { session: Session; user: AuthUser };

export async function getSession() {
  return await getCurrentSession();
}

export async function getVerifiedUserId() {
  const { user } = await getCurrentSession();
  return user?.emailVerified ? user.id : null;
}

export async function requireStaffPage(): Promise<AuthSession> {
  const { session, user } = await getCurrentSession();
  if (!session || !isVerifiedStaff(user)) redirect("/");
  return { session, user };
}

export async function requireVerifiedPage(): Promise<AuthSession> {
  const { session, user } = await getCurrentSession();
  if (!session) redirect("/auth/signin");
  if (!user.emailVerified) redirect("/auth/verify-email");
  return { session, user };
}

export function isVerifiedStaff(user: AuthUser | null): user is AuthUser {
  return (
    user !== null && user.emailVerified && (user.role === "librarian" || user.role === "admin")
  );
}

type Handler<TInput extends z.ZodTypeAny, TOutput> = (
  input: z.output<TInput>,
  session: AuthSession,
) => Promise<TOutput>;

export function protectedAction<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  allowedRoles: Role[],
  handler: Handler<TInput, TOutput>,
) {
  return async (input: z.input<TInput>): Promise<ActionResult<TOutput>> => {
    const { session, user } = await getCurrentSession();

    if (!session || !user) {
      return Err({ code: "unauthorized", message: "Inicia sesión para continuar." });
    }
    if (user.role !== "admin" && !allowedRoles.includes(user.role)) {
      return Err({ code: "forbidden", message: "No tienes permiso para hacer esto." });
    }
    if (!user.emailVerified) {
      return Err({ code: "unverified", message: "Verifica tu correo electrónico para continuar." });
    }

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return Err({ code: "invalid", message: "Los datos enviados no son válidos." });
    }

    try {
      return Ok(await handler(parsed.data, { session, user }));
    } catch (error) {
      if (error instanceof UserError) {
        return Err({ code: error.code, message: error.message });
      }
      console.error("Server action failed:", error);
      return Err({ code: "failed", message: UNEXPECTED_ERROR });
    }
  };
}

export function authenticatedAction<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  handler: Handler<TInput, TOutput>,
) {
  return protectedAction(schema, ["user", "librarian", "admin"], handler);
}

export function staffAction<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  handler: Handler<TInput, TOutput>,
) {
  return protectedAction(schema, ["librarian", "admin"], handler);
}
