import { requireStaffPage } from "@/features/auth/protected-action";
import { BookEditorLoader } from "@/features/books/components/book-editor-loader";

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  return <BookEditorLoader bookId={id} />;
}
