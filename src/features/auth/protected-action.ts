import { getCurrentSession } from "@/features/auth/core/session";
import { z } from "zod";
import type { Role } from "@/lib/db/schema";
import type { Session, AuthUser } from "@/features/auth/core/session";

export type AuthSession = { session: Session; user: AuthUser };

export async function getSession() {
  return await getCurrentSession();
}

export function protectedAction<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  allowedRoles: Role[],
  handler: (input: z.infer<TInput>, session: AuthSession) => Promise<TOutput>,
) {
  return async (input: z.infer<TInput>): Promise<TOutput> => {
    const { session, user } = await getCurrentSession();

    if (!session || !user) {
      throw new Error("Unauthorized: You must be logged in to perform this action.");
    }

    const hasAccess = user.role === "admin" || allowedRoles.includes(user.role);
    if (!hasAccess) {
      throw new Error(
        `Forbidden: Role '${user.role}' does not have permission to perform this action.`,
      );
    }

    const validatedInput = schema.parse(input);
    return await handler(validatedInput, { session, user });
  };
}

export function authenticatedAction<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  handler: (input: z.infer<TInput>, session: AuthSession) => Promise<TOutput>,
) {
  return protectedAction(schema, ["user", "librarian", "admin"], handler);
}

export function staffAction<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  handler: (input: z.infer<TInput>, session: AuthSession) => Promise<TOutput>,
) {
  return protectedAction(schema, ["librarian", "admin"], handler);
}
