"use server";

import { z } from "zod";
import { staffAction } from "@/features/auth/protected-action";
import { listBorrowHistory } from "./repository";
import { getDetailedAdminStatsService } from "./service";

export const getDetailedAdminStats = staffAction(z.void(), async () => {
  return getDetailedAdminStatsService();
});

export const getBorrowingHistory = staffAction(
  z.object({ limit: z.number().int().min(1).max(200).default(50) }),
  async ({ limit }) => listBorrowHistory(limit),
);
