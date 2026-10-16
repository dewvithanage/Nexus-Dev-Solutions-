import path from "path";
import { defineConfig } from "vitest/config";
// Scoped rendering checks, with mocked database calls and no environment-file loading.
export default defineConfig({
  envDir: false,
  resolve: { alias: { "@": path.resolve(__dirname) } },
  esbuild: { jsx: "automatic" },
  test: { environment: "node", include: ["tests/dewmi-server-pages.test.ts"] },
});
