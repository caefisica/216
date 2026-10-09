import { requireStaffPage } from "@/features/auth/protected-action";
import { BookEditorLoader } from "@/features/books/components/book-editor-loader";

export default async function NewBookPage() {
  await requireStaffPage();
  return <BookEditorLoader />;
}
