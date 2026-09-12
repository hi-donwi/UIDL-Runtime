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
      entry: path.resolve(__dirname, "packages/core/src/index.ts"),
      name: "VisualBuild",
      formats: ["es", "cjs"],
      fileName: "uidl-runtime",
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
