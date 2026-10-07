"use server";

import { z } from "zod";
import {
  protectedAction,
  authenticatedAction,
  staffAction,
} from "@/features/auth/protected-action";
import { Role } from "@/lib/db/schema";
import { listUsers, listUserActivity } from "./repository";
import { updateUserProfileService, updateUserRoleService, suspendUserService } from "./service";

const UserIdSchema = z.string().min(1);

const RoleUpdateSchema = z.object({
  userId: UserIdSchema,
  newRole: z.enum(Role),
});

const ProfileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

export const getAllUsers = staffAction(z.void(), async () => {
  return listUsers();
});

export const getUserActivity = authenticatedAction(z.void(), async (_, session) => {
  return listUserActivity(session.user.id);
});

export const updateUserProfile = authenticatedAction(ProfileUpdateSchema, async (data, session) => {
  return updateUserProfileService(session.user.id, data.name);
});

export const updateUserRole = protectedAction(
  RoleUpdateSchema,
  ["admin"],
  async ({ userId, newRole }, session) => {
    return updateUserRoleService(session.user.id, userId, newRole);
  },
);

export const suspendUser = protectedAction(
  z.object({ userId: UserIdSchema }),
  ["admin"],
  async ({ userId }, session) => {
    return suspendUserService(session.user.id, userId);
  },
);
