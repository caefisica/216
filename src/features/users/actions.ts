"use server";

import { z } from "zod";
import {
  protectedAction,
  authenticatedAction,
  staffAction,
} from "@/features/auth/protected-action";
import { listUsers, listUserActivity } from "./repository";
import { updateUserProfileService, updateUserRoleService, suspendUserService } from "./service";

const RoleUpdateSchema = z.object({
  userId: z.string(),
  newRole: z.enum(["user", "librarian", "admin", "suspended"]),
});

const ProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
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
  async ({ userId, newRole }) => {
    return updateUserRoleService(userId, newRole);
  },
);

export const suspendUser = protectedAction(
  z.object({ userId: z.string() }),
  ["admin"],
  async ({ userId }) => {
    return suspendUserService(userId);
  },
);
