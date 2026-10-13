import fs from "fs";
import path from "path";

// The tests wipe and rebuild their database. These checks make sure that
// can only ever happen to a database meant for testing, never the team's
// real one in .env.

function readEnvFileDatabaseUrl(): string | null {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return null;
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith("DATABASE_URL="));
  if (!line) return null;
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

export function assertSafeTestDatabaseUrl(url: string) {
  const realUrl = readEnvFileDatabaseUrl();
  if (realUrl && url === realUrl) {
    throw new Error("Refusing to run tests: the test database URL is the same as DATABASE_URL in .env.");
  }

  const databaseName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(databaseName)) {
    throw new Error(
      `Refusing to run tests: database name "${databaseName}" does not contain "test". ` +
        "Point TEST_DATABASE_URL at a database created only for tests."
    );
  }
}
