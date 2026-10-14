import path from "path";
import { defineConfig } from "vitest/config";

// Email-only checks use a mocked SMTP transport: no environment file,
// database connection, migrations, or real emails.
export default defineConfig({
  envDir: false,
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { environment: "node", include: ["tests/password-reset-email.test.ts", "tests/password-reset-route.test.ts"] },
});
