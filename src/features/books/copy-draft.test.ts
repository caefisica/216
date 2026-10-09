import { describe, expect, it } from "vitest";
import { CopyFieldsSchema } from "./schemas";
import { draftFromCopy, draftToInput, emptyDraft, findDonor } from "./copy-draft";
import type { CopyView } from "./types";

const LOCATION = "5a1d3a52-0a63-4b0e-9f43-1d5d7a3b0c11";
const DONOR = "7c0b9a64-2f7d-4a63-8d1e-3b9c2d4e5f22";

const copy = {
  id: "c1",
  bookId: "b1",
  number: 2,
  code: "CAFG.1.05.2",
  origin: "copy",
  volume: "II",
  pieces: 2,
  edition: "3",
  year: 1999,
  country: "Perú",
  publisher: "Thales",
  locationId: LOCATION,
  donorId: DONOR,
  status: "maintenance",
  condition: "fair",
  labelled: true,
  notes: "Anillado",
  location: { id: LOCATION, cabinet: "A", shelf: 1, bay: 1 },
  donor: { id: DONOR, name: "Ana Morante" },
  loanId: null,
} as CopyView;

describe("copy drafts", () => {
  it("round-trips a copy through the form and the schema", () => {
    const input = draftToInput(draftFromCopy(copy), DONOR);
    expect(CopyFieldsSchema.parse(input)).toMatchObject({
      origin: "copy",
      volume: "II",
      pieces: 2,
      year: 1999,
      locationId: LOCATION,
      donorId: DONOR,
      status: "maintenance",
      condition: "fair",
      labelled: true,
      notes: "Anillado",
    });
  });

  it("turns the blanks of a new copy into nulls", () => {
    expect(CopyFieldsSchema.parse(draftToInput(emptyDraft(), null))).toMatchObject({
      origin: "original",
      volume: null,
      year: null,
      locationId: null,
      donorId: null,
      condition: null,
      labelled: false,
    });
  });

  it("starts unlabelled, because the librarian has not written the code on the spine yet", () => {
    expect(emptyDraft().labelled).toBe(false);
    expect(emptyDraft({ origin: "copy" }).origin).toBe("copy");
  });
});

describe("findDonor", () => {
  const donors = [
    { id: "d1", name: "Ana Morante" },
    { id: "d2", name: "Robert Guzman" },
  ];

  it("matches a name ignoring case and stray spacing", () => {
    expect(findDonor("  ana MORANTE ", donors)?.id).toBe("d1");
  });

  it("finds nothing for an unknown or empty name", () => {
    expect(findDonor("Ana", donors)).toBeUndefined();
    expect(findDonor("  ", donors)).toBeUndefined();
  });
});
