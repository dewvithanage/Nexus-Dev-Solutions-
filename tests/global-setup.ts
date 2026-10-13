import { execSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";
import type EmbeddedPostgres from "embedded-postgres";
import type { TestProject } from "vitest/node";

// Runs once before all test files.
//
// By default this starts a private PostgreSQL server in a temp folder, so
// tests run against a real database that is created fresh and thrown away
// afterwards. To use a different test database instead (e.g. a Neon test
// branch in CI), set TEST_DATABASE_URL. The normal DATABASE_URL from .env is
// never used, so tests can't change live data.

const PORT = 54329;
const USER = "postgres";
const PASSWORD = "test"; // throwaway local test server only

let pg: EmbeddedPostgres | null = null;
let dataDir: string | null = null;

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export async function setup(project: TestProject) {
  let databaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    // Loaded only here, so CI (which provides its own Postgres) never needs it.
    const { default: EmbeddedPostgresServer } = await import("embedded-postgres");
    dataDir = mkdtempSync(path.join(os.tmpdir(), "startup-spark-test-db-"));
    pg = new EmbeddedPostgresServer({
      databaseDir: dataDir,
      user: USER,
      password: PASSWORD,
      port: PORT,
      persistent: false,
      onLog: () => {},
    });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase("startup_spark_test");
    databaseUrl = `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/startup_spark_test`;
  }

  // Build the schema from the committed migrations, the same way a fresh
  // environment would.
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  project.provide("databaseUrl", databaseUrl);
}

export async function teardown() {
  if (pg) await pg.stop();
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
}
