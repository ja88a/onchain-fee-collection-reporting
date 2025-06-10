import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./packages/database/vitest.config.ts",
  "./packages/events-scraper/vitest.config.ts",
  "./packages/fees-reporter/vitest.config.ts",
]);
  