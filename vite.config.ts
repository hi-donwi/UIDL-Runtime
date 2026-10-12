import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ["packages/core/src/**/*.ts", "packages/core/src/**/*.tsx"],
      exclude: ["packages/core/src/**/*.test.ts", "packages/core/src/**/*.test.tsx", "packages/core/src/test/**"],
      entryRoot: "packages/core/src",
      outDir: "dist",
    }),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./packages/core/src"),
      "@uidl-runtime/core": path.resolve(__dirname, "./packages/core/src"),
      "@uidl-runtime/templates": path.resolve(__dirname, "./packages/templates/src"),
      "uidl-runtime": path.resolve(__dirname, "./packages/core/src"),
    },
  },
  build: {
    lib: {
      // Two entries: the full runtime, and the page recipes alone. Recipes are pure functions
      // from metadata to a UIDL document, so a compiler, a server, or a CLI can build pages
      // without React in its dependency graph (`uidl-runtime/recipes`).
      entry: {
        "uidl-runtime": path.resolve(__dirname, "packages/core/src/index.ts"),
        recipes: path.resolve(__dirname, "packages/core/src/compiler/index.ts"),
      },
      name: "VisualBuild",
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "mjs" : "js"}`,
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    sourcemap: true,
  },
});
