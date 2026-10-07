import { requireVerifiedPage } from "@/features/auth/protected-action";
import { FavoritesClient } from "./favorites-client";

export default async function FavoritesPage() {
  await requireVerifiedPage();
  return <FavoritesClient />;
}
