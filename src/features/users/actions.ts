"use server";

import { z } from "zod";
import { protectedAction, authenticatedAction } from "@/features/auth/protected-action";
import { Role } from "@/lib/db/schema";
import { updateUserProfileService, updateUserRoleService } from "./service";

const UserIdSchema = z.string().min(1);

const RoleUpdateSchema = z.object({
  userId: UserIdSchema,
  newRole: z.enum(Role),
});

const ProfileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
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
