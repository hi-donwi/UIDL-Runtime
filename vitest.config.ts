import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./packages/core/src"),
      "@uidl-runtime/core": path.resolve(__dirname, "./packages/core/src"),
      "@uidl-runtime/templates": path.resolve(__dirname, "./packages/templates/src"),
      "uidl-runtime": path.resolve(__dirname, "./packages/core/src"),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "packages/**/*.test.{ts,tsx}",
      "apps/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["./packages/core/src/test/setup.ts"],
  },
});
