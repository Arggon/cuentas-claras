import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only source tests: the default glob also matches the compiled
    // dist/*.test.js after `npm run build` and doubles the suite.
    include: ["src/**/*.test.ts"],
  },
});
