import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "../../packages/core/src"),
      "@uidl-runtime/core": path.resolve(__dirname, "../../packages/core/src"),
      "@uidl-runtime/templates": path.resolve(__dirname, "../../packages/templates/src"),
      "uidl-runtime": path.resolve(__dirname, "../../packages/core/src"),
    },
  },
});
