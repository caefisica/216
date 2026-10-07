import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

const request = (method: string, headers: Record<string, string> = {}) =>
  new NextRequest("https://library.test/books", { method, headers });

describe("same-origin check", () => {
  it("lets GET and HEAD through without an Origin", async () => {
    for (const method of ["GET", "HEAD"]) {
      expect((await middleware(request(method))).status, method).toBe(200);
    }
  });

  it("refuses a write with no Origin, or from another site", async () => {
    for (const method of ["POST", "PUT", "DELETE"]) {
      const none = await middleware(request(method, { host: "library.test" }));
      const other = await middleware(
        request(method, { host: "library.test", origin: "https://evil.test" }),
      );
      expect([none.status, other.status], method).toEqual([403, 403]);
    }
  });

  it("refuses an Origin that is not a URL", async () => {
    const response = await middleware(
      request("POST", { host: "library.test", origin: "not a url" }),
    );
    expect(response.status).toBe(403);
  });

  it("lets a write from the same site through", async () => {
    const response = await middleware(
      request("POST", { host: "library.test", origin: "https://library.test" }),
    );
    expect(response.status).toBe(200);
  });
});

describe("session cookie", () => {
  it("is renewed on a read and not invented when absent", async () => {
    const withCookie = await middleware(request("GET", { cookie: "session=abc" }));
    expect(withCookie.cookies.get("session")?.value).toBe("abc");
    expect((await middleware(request("GET"))).cookies.get("session")).toBeUndefined();
  });
});
