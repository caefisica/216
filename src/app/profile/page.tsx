import { requireVerifiedPage } from "@/features/auth/protected-action";
import { listUserActivity } from "@/features/users/repository";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const { user } = await requireVerifiedPage();
  const borrowHistory = await listUserActivity(user.id);
  return <ProfileClient user={user} borrowHistory={borrowHistory} />;
}
