import { describe, expect, it } from "vitest";
import { getFileUrl } from "@/lib/storage";
import { AddBookImageSchema } from "./schemas";

const bookId = "b31b11c9-a283-4638-bef0-161d9a57537b";

describe("AddBookImageSchema", () => {
  it("accepts the URL an upload returns", () => {
    const imageUrl = getFileUrl("book-images/0a1b-my cover.png");

    const parsed = AddBookImageSchema.safeParse({
      bookId,
      imageUrl,
      isCover: true,
      displayOrder: 0,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects an image that is not served by this app", () => {
    const parsed = AddBookImageSchema.safeParse({
      bookId,
      imageUrl: "https://example.com/cover.png",
      isCover: false,
      displayOrder: 0,
    });

    expect(parsed.success).toBe(false);
  });
});
