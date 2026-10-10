import { getCurrentSession } from "@/features/auth/core/session";
import { isVerifiedStaff } from "@/features/auth/protected-action";
import { getDeskCounts } from "@/features/loans/service";
import { HeaderClient } from "./header-client";

export async function Header() {
  const { user } = await getCurrentSession();
  const staff = isVerifiedStaff(user);
  const pending = staff ? (await getDeskCounts()).pending : 0;
  return <HeaderClient user={user} staff={staff} pending={pending} />;
}
