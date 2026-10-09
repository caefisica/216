import type { CategoryRef, LocationOption } from "./types";

/**
 * The bay a new copy most likely stands in: the first copy in the category's main bay, later
 * copies in its extra bay. Returns null when the category has no bay of the wanted kind or
 * several, so the librarian chooses instead of accepting a guess.
 */
export function defaultLocation(
  locations: LocationOption[],
  category: Pick<CategoryRef, "code" | "parent">,
  copyNumber: number,
) {
  const codes = new Set([category.code, category.parent?.code]);
  const bays = locations.filter((l) => l.categoryCode !== null && codes.has(l.categoryCode));
  const wanted = copyNumber === 1 ? "primary" : "extra";
  const ofKind = bays.filter((l) => l.holds === wanted);
  const candidates = ofKind.length > 0 ? ofKind : bays.filter((l) => l.holds === "primary");
  return candidates.length === 1 ? candidates[0].id : null;
}
