import { describe, expect, it } from "vitest";
import { stableId } from "./ids";

describe("stableId", () => {
  it("gives the same id for the same name, on every host", async () => {
    expect(await stableId("book:CAFG.1.05")).toBe(await stableId("book:CAFG.1.05"));
    // Python's uuid.uuid5 over the same namespace gives this value.
    expect(await stableId("book:CAFG.1.05")).toBe("1ea01dda-924b-59cc-85b3-2cddc3cf292d");
  });

  it("gives different ids for different names", async () => {
    expect(await stableId("book:CAFG.1.05")).not.toBe(await stableId("copy:CAFG.1.05.1"));
  });

  it("is a version 5 UUID", async () => {
    expect(await stableId("donor:Ana")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
