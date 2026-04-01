import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    globals: true,
    define: {
      "import.meta.vitest": "undefined",
      __TEST_ENVIRONMENT__: "true",
    },
  },
});
