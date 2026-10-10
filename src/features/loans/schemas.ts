import { z } from "zod";

export const ApproveRequestSchema = z.object({ requestId: z.uuid(), copyId: z.uuid() });

export const RejectionReasonSchema = z
  .string()
  .trim()
  .min(1, "El motivo no puede estar vacío")
  .max(300, "El motivo no puede pasar de 300 caracteres");

export const RejectRequestSchema = z.object({
  requestId: z.uuid(),
  reason: RejectionReasonSchema,
});

export const ReturnLoanSchema = z.object({ requestId: z.uuid() });
export const ReopenLoanSchema = ReturnLoanSchema;

export const DESK_VIEWS = ["requests", "loans"] as const;
export type DeskView = (typeof DESK_VIEWS)[number];

export const DESK_PAGE_SIZE = 25;

/**
 * The URL search parameters of the desk. A malformed value falls back to its default. Without a
 * view the desk opens on whichever list has work in it.
 */
export const DeskQuerySchema = z.object({
  view: z.enum(DESK_VIEWS).optional().catch(undefined),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
