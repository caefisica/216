import { requireVerifiedPage } from "@/features/auth/protected-action";
import { getFavoriteBooksService } from "@/features/books/service";
import { FavoritesClient } from "./favorites-client";

export default async function FavoritesPage() {
  const { user } = await requireVerifiedPage();
  const favoriteBooks = await getFavoriteBooksService(user.id);
  return <FavoritesClient initialBooks={favoriteBooks} />;
}
