import type { Result } from "./result";

export type ActionErrorCode = "unauthorized" | "forbidden" | "unverified" | "invalid" | "failed";

export type ActionError = { code: ActionErrorCode; message: string };

/**
 * What a server action returns to the browser. Production Next.js replaces the message of an
 * error thrown from a server action, so failures travel as values.
 */
export type ActionResult<T> = Result<T, ActionError>;

/**
 * A failure the user should read. Services throw it and the action wrapper turns it into an
 * `ActionError`. Any other error is logged and shown as `UNEXPECTED_ERROR`, so internals do not
 * reach the browser.
 */
export class UserError extends Error {
  constructor(
    message: string,
    readonly code: ActionErrorCode = "failed",
  ) {
    super(message);
  }
}

export const UNEXPECTED_ERROR = "Ocurrió un error inesperado. Inténtalo de nuevo.";
