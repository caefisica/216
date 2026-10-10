import { revalidatePath } from "next/cache";
import { UserError } from "@/lib/action";
import type { Role } from "@/lib/db/schema";
import { updateUserName, setUserRole } from "./repository";

export async function updateUserProfileService(userId: string, name?: string) {
  const user = await updateUserName(userId, name);
  revalidatePath("/profile");
  return user;
}

/** An admin cannot change their own role, so the last admin cannot lock everyone out. */
export async function updateUserRoleService(actorId: string, userId: string, newRole: Role) {
  if (userId === actorId) throw new UserError("No puedes cambiar tu propio rol.");
  if (!(await setUserRole(userId, newRole))) throw new UserError("Usuario no encontrado.");
  revalidatePath("/");
}
