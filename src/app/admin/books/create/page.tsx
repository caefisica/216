import { requireStaffPage } from "@/features/auth/protected-action";
import { NewBookClient } from "./new-book-client";

export default async function NewBookPage() {
  await requireStaffPage();
  return <NewBookClient />;
}
