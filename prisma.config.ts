
import "dotenv/config";
import { defineConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default defineConfig({
  orm: ormConfig({
    contract: "./prisma/schema.prisma",
    db: {
      connection: process.env["DATABASE_URL"]!,
    },
  }),
});
