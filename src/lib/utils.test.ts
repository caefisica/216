import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("lets a later size replace the control height", () => {
    expect(cn("h-control w-full", "h-11")).toBe("w-full h-11");
    expect(cn("size-control", "size-9")).toBe("size-9");
    expect(cn("min-h-control", "min-h-0")).toBe("min-h-0");
  });

  it("lets the control height replace an earlier size", () => {
    expect(cn("h-9", "h-control")).toBe("h-control");
  });
});
