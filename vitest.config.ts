import path from "path";
import { defineConfig } from "vitest/config";

// Tests call the real Route Handlers against a real PostgreSQL database.
// tests/global-setup.ts starts a throwaway local Postgres (or uses
// TEST_DATABASE_URL) and applies prisma/migrations to it, so `npm test`
// never touches the live Neon database.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  // Compile JSX the way Next.js does, so tests can render server pages.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
