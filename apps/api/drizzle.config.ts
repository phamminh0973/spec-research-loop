import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    // For drizzle-kit push/generate. Uses file-backed SQLite when
    // DATABASE_PATH/DB_FILE_NAME is set, otherwise falls back to a local file
    // for tooling (does not affect runtime :memory: behaviour).
    url: process.env.DATABASE_PATH ?? process.env.DB_FILE_NAME ?? "./data.db",
  },
});
