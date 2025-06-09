import { Linter } from "eslint";
import { config } from "@repo/eslint-config/base";

export default [
  ...config,
  {
    ignores: ["dist/**", ".turbo/**", "node_modules/**"],
  },
] satisfies Linter.Config[];
