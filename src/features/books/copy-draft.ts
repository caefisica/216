import type { z } from "zod";
import type { CopyFieldsSchema } from "./schemas";
import type { CopyCondition, CopyOrigin, CopyStatus, CopyView, Donor } from "./types";

/** A copy as the intake form holds it: every field is text until it is saved. */
export interface CopyDraft {
  origin: CopyOrigin;
  volume: string;
  pieces: string;
  edition: string;
  year: string;
  country: string;
  publisher: string;
  locationId: string;
  donorName: string;
  status: CopyStatus;
  condition: CopyCondition | "";
  labelled: boolean;
  notes: string;
}

export type CopyInput = z.input<typeof CopyFieldsSchema>;

/** `labelled` starts false: the app issued the code, and nobody has written it on the spine yet. */
export function emptyDraft(overrides: Partial<CopyDraft> = {}): CopyDraft {
  return {
    origin: "original",
    volume: "",
    pieces: "1",
    edition: "",
    year: "",
    country: "",
    publisher: "",
    locationId: "",
    donorName: "",
    status: "present",
    condition: "",
    labelled: false,
    notes: "",
    ...overrides,
  };
}

export function draftFromCopy(copy: CopyView): CopyDraft {
  return {
    origin: copy.origin,
    volume: copy.volume ?? "",
    pieces: String(copy.pieces),
    edition: copy.edition ?? "",
    year: copy.year === null ? "" : String(copy.year),
    country: copy.country ?? "",
    publisher: copy.publisher ?? "",
    locationId: copy.locationId ?? "",
    donorName: copy.donor?.name ?? "",
    status: copy.status,
    condition: copy.condition ?? "",
    labelled: copy.labelled,
    notes: copy.notes ?? "",
  };
}

/** The donor already on file whose name matches, ignoring case and stray spacing. */
export function findDonor(name: string, donors: Pick<Donor, "id" | "name">[]) {
  const wanted = name.trim().toLowerCase();
  return wanted === "" ? undefined : donors.find((d) => d.name.trim().toLowerCase() === wanted);
}

export function draftToInput(draft: CopyDraft, donorId: string | null): CopyInput {
  return {
    origin: draft.origin,
    volume: draft.volume,
    pieces: Number(draft.pieces),
    edition: draft.edition,
    year: draft.year.trim() === "" ? null : Number(draft.year),
    country: draft.country,
    publisher: draft.publisher,
    locationId: draft.locationId || null,
    donorId,
    status: draft.status,
    condition: draft.condition || null,
    labelled: draft.labelled,
    notes: draft.notes,
  };
}
