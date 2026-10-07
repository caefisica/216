"use server";

import { z } from "zod";
import { staffAction } from "@/features/auth/protected-action";
import { getAdminCounts, listPendingBorrowRequests, listBorrowHistory } from "./repository";
import { getDetailedAdminStatsService, updateBorrowStatusService } from "./service";

const BorrowStatusSchema = z.object({
  requestId: z.uuid(),
  status: z.enum(["approved", "rejected"]),
});

export const getAdminStats = staffAction(z.void(), async () => {
  return getAdminCounts();
});

export const getPendingBorrowRequests = staffAction(z.void(), async () => {
  return listPendingBorrowRequests();
});

export const getDetailedAdminStats = staffAction(z.void(), async () => {
  return getDetailedAdminStatsService();
});

export const getBorrowingHistory = staffAction(
  z.object({ limit: z.number().default(50) }),
  async ({ limit }) => listBorrowHistory(limit),
);

export const updateBorrowStatus = staffAction(
  BorrowStatusSchema,
  async ({ requestId, status }, session) => {
    return updateBorrowStatusService(requestId, status, session.user.id);
  },
);
