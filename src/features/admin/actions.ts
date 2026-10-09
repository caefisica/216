"use server";

import { z } from "zod";
import { staffAction } from "@/features/auth/protected-action";
import { listActiveLoans, listBorrowHistory } from "./repository";
import {
  getDetailedAdminStatsService,
  getPendingRequestsService,
  returnLoanService,
  updateBorrowStatusService,
} from "./service";

const BorrowStatusSchema = z.object({
  requestId: z.uuid(),
  status: z.enum(["approved", "rejected"]),
  copyId: z.uuid().optional(),
});

export const getPendingBorrowRequests = staffAction(z.void(), async () => {
  return getPendingRequestsService();
});

export const getActiveLoans = staffAction(z.void(), async () => {
  return listActiveLoans();
});

export const returnLoan = staffAction(z.object({ requestId: z.uuid() }), async ({ requestId }) =>
  returnLoanService(requestId),
);

export const getDetailedAdminStats = staffAction(z.void(), async () => {
  return getDetailedAdminStatsService();
});

export const getBorrowingHistory = staffAction(
  z.object({ limit: z.number().int().min(1).max(200).default(50) }),
  async ({ limit }) => listBorrowHistory(limit),
);

export const updateBorrowStatus = staffAction(
  BorrowStatusSchema,
  async ({ requestId, status, copyId }, session) => {
    return updateBorrowStatusService(requestId, status, session.user.id, copyId);
  },
);
