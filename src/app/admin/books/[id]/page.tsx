import { requireStaffPage } from "@/features/auth/protected-action";
import { EditBookClient } from "./edit-book-client";

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  return <EditBookClient bookId={id} />;
}
