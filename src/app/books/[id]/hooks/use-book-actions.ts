import { useState } from "react";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { TOAST_MESSAGES } from "../constants/book-constants";
import type { AuthUser } from "@/features/auth/core/session";
import { createBorrowRequest, setHeart } from "@/features/books/actions";
import { useRouter } from "next/navigation";

export function useBookActions(
  user: AuthUser | null,
  bookId: string,
  initialBook?: { id: string; isHearted?: boolean; heartsCount?: number },
) {
  const router = useRouter();
  const [borrowing, setBorrowing] = useState(false);
  const [borrowNote, setBorrowNote] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isHearted, setIsHearted] = useState(initialBook?.isHearted || false);
  const [heartsCount, setHeartsCount] = useState(initialBook?.heartsCount || 0);

  const handleToggleHeart = async () => {
    if (!user) {
      toast({
        ...TOAST_MESSAGES.SIGN_IN_REQUIRED,
        ...TOAST_MESSAGES.HEART_SIGN_IN,
      });
      return;
    }

    const result = await setHeart({ bookId, hearted: !isHearted });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    const { hearted } = result.value;
    setIsHearted(hearted);
    setHeartsCount((prev) => (hearted ? prev + 1 : prev - 1));
    router.refresh();
  };
  const handleBorrowRequest = async () => {
    if (!user) {
      toast({
        ...TOAST_MESSAGES.SIGN_IN_REQUIRED,
        ...TOAST_MESSAGES.BORROW_SIGN_IN,
      });
      return;
    }

    setBorrowing(true);
    try {
      const result = await createBorrowRequest({ bookId, note: borrowNote });
      if (isErr(result)) {
        toastActionError(result.error);
        return;
      }
      toast(TOAST_MESSAGES.REQUEST_SUBMITTED);
      setBorrowNote("");
      setDialogOpen(false);
      router.refresh();
    } finally {
      setBorrowing(false);
    }
  };

  return {
    borrowing,
    borrowNote,
    setBorrowNote,
    dialogOpen,
    setDialogOpen,
    isHearted,
    heartsCount,
    handleBorrowRequest,
    handleToggleHeart,
  };
}
