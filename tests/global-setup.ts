import { execSync } from "child_process";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import EmbeddedPostgres from "embedded-postgres";
import type { TestProject } from "vitest/node";

import { assertSafeTestDatabaseUrl } from "./db-safety";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

// Runs once before all test files.
//
// By default a real PostgreSQL server (the embedded-postgres package) is
// started in a temporary folder and deleted afterwards, so `npm test` needs
// no setup and can never touch the team database. To use another test
// database instead, set TEST_DATABASE_URL (its name must contain "test").
export default async function setup(project: TestProject) {
  let databaseUrl = process.env.TEST_DATABASE_URL;
  let embedded: EmbeddedPostgres | null = null;
  let dataDir: string | null = null;

  if (!databaseUrl) {
    const port = await findFreePort();
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "startup-spark-test-db-"));
    embedded = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: "postgres",
      password: "postgres",
      port,
      persistent: false,
      onLog: () => {},
      onError: () => {},
    });
    await embedded.initialise();
    await embedded.start();
    await embedded.createDatabase("startup_spark_test");
    databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/startup_spark_test`;
  }

  const teardown = async () => {
    if (embedded) await embedded.stop();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  };

  try {
    assertSafeTestDatabaseUrl(databaseUrl);

    // Creates the tables straight from prisma/schema.prisma. No reset flag:
    // the embedded database is brand new and empty on every run, and the
    // tests empty the tables themselves (tests/helpers.ts resetDatabase).
    // (prisma/migrations cannot currently rebuild a database from scratch:
    // see the "Database migrations" note in README.md.)
    execSync("npx prisma db push --skip-generate", {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
    });
  } catch (error) {
    await teardown();
    const output = (error as { stderr?: Buffer }).stderr?.toString().trim();
    throw new Error(output ? `Test database setup failed:\n${output}` : String(error));
  }

  project.provide("databaseUrl", databaseUrl);

  return teardown;
}
