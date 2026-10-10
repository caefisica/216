import type {
  books,
  categories,
  bookImages,
  copies,
  locations,
  donors,
  CopyOrigin,
  CopyStatus,
  CopyCondition,
  LocationHolds,
} from "@/lib/db/schema";

export type Book = typeof books.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type BookImage = typeof bookImages.$inferSelect;
export type Copy = typeof copies.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Donor = typeof donors.$inferSelect;
export type { CopyOrigin, CopyStatus, CopyCondition, LocationHolds };

/** Selects the title fields shown in a loan or statistics row. */
export type BookSummary = Pick<Book, "id" | "code" | "title" | "author" | "imageUrl"> & {
  category: Pick<Category, "id" | "code" | "name">;
};

export interface CategoryRef {
  id: string;
  code: string;
  name: string;
  parent: { id: string; code: string; name: string } | null;
}

export interface BookListItem extends BookSummary {
  category: CategoryRef;
  copyCount: number;
  lendableCount: number;
  isHearted: boolean;
}

/** One page of the list; `total` counts every title that matches the filters. */
export interface BookPage {
  items: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CopyView extends Copy {
  location: Pick<Location, "id" | "cabinet" | "shelf" | "bay"> | null;
  donor: Pick<Donor, "id" | "name"> | null;
  /** The approved loan that holds this copy, if any. */
  loanId: string | null;
  /** When that loan is due back. */
  dueDate: Date | null;
}

/** The reader's own open request for a title: waiting for a librarian, or on loan. */
export interface ReaderRequest {
  status: "pending" | "approved";
  dueDate: Date | null;
}

export interface BookDetailed extends Book {
  category: CategoryRef;
  images: BookImage[];
  coverImage?: BookImage;
  copies: CopyView[];
  lendableCount: number;
  isHearted: boolean;
  /** Null for a visitor and for a reader with no open request. */
  request: ReaderRequest | null;
}

/** A node of the category tree with the number of titles under it. */
export interface CategoryNode extends Category {
  bookCount: number;
  children: CategoryNode[];
}

export interface LocationOption extends Location {
  categoryCode: string | null;
}

export interface CatalogueFacets {
  categories: CategoryNode[];
  donors: { id: string; name: string; motivation: string | null; copyCount: number }[];
  copyHealth: {
    present: number;
    maintenance: number;
    missing: number;
    unlabelled: number;
    unplaced: number;
  };
}
