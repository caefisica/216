import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Database test files run separate workerd instances, and each query crosses into its instance.
    // A seeded test takes about 3 s alone, and parallel files can double that on a busy machine.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
