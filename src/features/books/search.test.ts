import { describe, expect, it } from "vitest";
import { bookSearchText, codeRange, looksLikeCode, normalizeSearch, titleKey } from "./search";

describe("normalizeSearch", () => {
  it("lowercases, drops accents and collapses spacing", () => {
    expect(normalizeSearch("  Cálculo   DIFERENCIAL\t")).toBe("calculo diferencial");
    expect(normalizeSearch("Ñandú Ünico")).toBe("nandu unico");
  });

  it("leaves digits and punctuation alone", () => {
    expect(normalizeSearch("Física 1 (vol. 4)")).toBe("fisica 1 (vol. 4)");
  });
});

describe("bookSearchText", () => {
  it("joins the title and the author, and copes with no author", () => {
    expect(bookSearchText("Óptica", "Hecht, E.")).toBe("optica hecht, e.");
    expect(bookSearchText("Óptica", null)).toBe("optica");
  });
});

describe("looksLikeCode", () => {
  it("recognises the start of a title or copy code", () => {
    for (const query of ["CAFG.1.05", "cafg.", "CALB01.1", " calb0 "]) {
      expect(looksLikeCode(query), query).toBe(true);
    }
  });

  it("does not take an ordinary word for a code", () => {
    for (const query of ["calculo", "cafe", "física 1", "ca", ""]) {
      expect(looksLikeCode(query), query).toBe(false);
    }
  });
});

describe("titleKey", () => {
  it("orders a title by its first letter, not by the mark it opens with", () => {
    const titles = ["¿Qué es la física?", "“Álgebra” lineal", "Zoología", "Óptica"];
    expect(titles.map(titleKey).sort()).toEqual([
      "algebra” lineal",
      "optica",
      "que es la fisica?",
      "zoologia",
    ]);
  });
});

describe("codeRange", () => {
  it("bounds the codes that start with the prefix, whatever its case", () => {
    expect(codeRange(" cafg.1.0 ")).toEqual(["CAFG.1.0", "CAFG.1.1"]);
    const [from, to] = codeRange("CAFG.1");
    for (const code of ["CAFG.1", "CAFG.1.05", "CAFG.1.05.2"]) {
      expect(code >= from && code < to, code).toBe(true);
    }
    for (const code of ["CAFG.0.99", "CAFG.2", "CAFN.1"]) {
      expect(code >= from && code < to, code).toBe(false);
    }
  });
});
