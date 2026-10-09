import { describe, expect, it } from "vitest";
import { defaultLocation } from "./location";
import type { LocationOption } from "./types";

const bay = (
  id: string,
  categoryCode: string | null,
  holds: LocationOption["holds"] = "primary",
): LocationOption =>
  ({ id, categoryCode, holds, cabinet: "A", shelf: 1, bay: 1 }) as LocationOption;

const sub = { code: "FG.1", parent: { id: "p", code: "FG", name: "Física General" } };
const flat = { code: "LB", parent: null };

describe("defaultLocation", () => {
  it("puts the first copy in the main bay of the category's parent", () => {
    const bays = [bay("main", "FG"), bay("spare", "FG", "extra"), bay("other", "CL")];
    expect(defaultLocation(bays, sub, 1)).toBe("main");
  });

  it("puts later copies in the extra bay", () => {
    const bays = [bay("main", "FG"), bay("spare", "FG", "extra")];
    expect(defaultLocation(bays, sub, 2)).toBe("spare");
  });

  it("falls back to the main bay when the category has no extra bay", () => {
    expect(defaultLocation([bay("main", "LB")], flat, 3)).toBe("main");
  });

  it("matches a bay labelled for the subcategory itself", () => {
    expect(defaultLocation([bay("exact", "FG.1"), bay("other", "CL")], sub, 1)).toBe("exact");
  });

  it("makes no guess when several bays fit or none does", () => {
    expect(defaultLocation([bay("a", "LB"), bay("b", "LB")], flat, 1)).toBeNull();
    expect(defaultLocation([bay("a", "CL")], flat, 1)).toBeNull();
    expect(defaultLocation([bay("orphan", null)], flat, 1)).toBeNull();
  });
});
