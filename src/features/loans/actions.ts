"use server";

import { staffAction } from "@/features/auth/protected-action";
import { ApproveRequestSchema, RejectRequestSchema, ReturnLoanSchema } from "./schemas";
import { approveRequestService, rejectRequestService, returnLoanService } from "./service";

export const approveRequest = staffAction(
  ApproveRequestSchema,
  async ({ requestId, copyId }, session) =>
    approveRequestService(requestId, copyId, session.user.id),
);

export const rejectRequest = staffAction(
  RejectRequestSchema,
  async ({ requestId, reason }, session) =>
    rejectRequestService(requestId, reason, session.user.id),
);

export const returnLoan = staffAction(ReturnLoanSchema, async ({ requestId }) =>
  returnLoanService(requestId),
);
