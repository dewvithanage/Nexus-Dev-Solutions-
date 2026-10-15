import path from "path";
import { defineConfig } from "vitest/config";

// Pure password-policy checks: no .env loading, database or migrations.
export default defineConfig({
  envDir: false,
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { environment: "node", include: ["tests/password-validation.test.ts", "tests/reset-password-route.test.ts"] },
});
