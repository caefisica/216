import { requireVerifiedPage } from "@/features/auth/protected-action";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const { user } = await requireVerifiedPage();
  return <ProfileClient user={user} />;
}
