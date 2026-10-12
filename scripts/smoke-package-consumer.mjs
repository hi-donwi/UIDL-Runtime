import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const tempRoot = path.join(tmpdir(), `uidl-runtime-consumer-${Date.now()}`);
const nodeModules = path.join(tempRoot, "node_modules");
const unpackedPackage = path.join(tempRoot, "package");

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
}

function linkDependency(name) {
  const source = path.join(projectRoot, "node_modules", name);
  const target = path.join(nodeModules, name);
  mkdirSync(path.dirname(target), { recursive: true });
  symlinkSync(source, target, "junction");
}

try {
  mkdirSync(nodeModules, { recursive: true });
  mkdirSync(path.join(tempRoot, "src"), { recursive: true });

  const packOutput = execFileSync("npm", ["pack", "--json"], { cwd: projectRoot, encoding: "utf8" });
  const [{ filename }] = JSON.parse(packOutput);
  const tarball = path.join(projectRoot, filename);

  mkdirSync(unpackedPackage, { recursive: true });
  run("tar", ["-xzf", tarball, "-C", unpackedPackage, "--strip-components=1"], { cwd: tempRoot });
  symlinkSync(unpackedPackage, path.join(nodeModules, packageJson.name), "junction");

  for (const name of new Set([...Object.keys(packageJson.dependencies ?? {}), ...Object.keys(packageJson.peerDependencies ?? {})])) {
    linkDependency(name);
  }

  writeFileSync(
    path.join(tempRoot, "package.json"),
    `${JSON.stringify({ type: "module", private: true, dependencies: { "uidl-runtime": "file:./package" }, devDependencies: { "@vitejs/plugin-react": packageJson.devDependencies["@vitejs/plugin-react"], vite: packageJson.devDependencies.vite, typescript: packageJson.devDependencies.typescript } }, null, 2)}\n`,
  );
  writeFileSync(path.join(tempRoot, "index.html"), `<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n`);
  writeFileSync(
    path.join(tempRoot, "src", "main.tsx"),
    `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport { Editor, renderUIDocument, type UIDLDocument } from "uidl-runtime";\nimport "uidl-runtime/style.css";\n\nconst document: UIDLDocument = {\n  version: "1.0",\n  metadata: { name: "Package Consumer Smoke" },\n  root: { id: "root", type: "Box", props: { className: "p-4" }, children: [{ id: "text", type: "Text", props: { text: "Package consumer smoke" } }] },\n};\n\nif (typeof Editor !== "function") {\n  throw new Error("Editor export is not callable");\n}\n\nconst element = renderUIDocument(document);\ncreateRoot(document.getElementById("root")!).render(React.createElement(React.Fragment, null, element));\n`,
  );

  run(path.join(projectRoot, "node_modules", ".bin", "vite"), ["build"], { cwd: tempRoot });

  // `uidl-runtime/recipes` must load with nothing else installed: no React, no zod. The package
  // is copied, not linked, into a folder with no other node_modules anywhere above it, so a
  // recipe bundle that imported React would fail to resolve here.
  const bareRoot = mkdtempSync(path.join(tmpdir(), "uidl-recipes-bare-"));
  try {
    cpSync(unpackedPackage, path.join(bareRoot, "node_modules", packageJson.name), { recursive: true });
    writeFileSync(path.join(bareRoot, "package.json"), `${JSON.stringify({ type: "module", private: true })}\n`);
    const meta = {
      name: "invoices",
      label: { id: "Faktur", en: "Invoices" },
      titleField: "number",
      fields: [{ key: "number", label: { id: "Nomor", en: "Number" }, widget: "TextField" }],
      columns: [{ field: "number" }],
      defaultSort: { field: "number", dir: "asc" },
    };
    const caps = { collections: ["invoices"], commands: [] };
    const check = (load) =>
      `${load}\nconst doc = compilePage({ recipe: "list", meta: ${JSON.stringify(meta)}, hostCapabilities: ${JSON.stringify(caps)} });\n` +
      `if (!doc.root || PAGE_RECIPES.length < 7) throw new Error("recipes did not compile a list page");\n`;
    writeFileSync(path.join(bareRoot, "esm.mjs"), check(`import { compilePage, PAGE_RECIPES } from "uidl-runtime/recipes";`));
    writeFileSync(path.join(bareRoot, "cjs.cjs"), check(`const { compilePage, PAGE_RECIPES } = require("uidl-runtime/recipes");`));
    run(process.execPath, ["esm.mjs"], { cwd: bareRoot });
    run(process.execPath, ["cjs.cjs"], { cwd: bareRoot });
  } finally {
    rmSync(bareRoot, { recursive: true, force: true });
  }
} finally {
  for (const entry of [`${packageJson.name}-${packageJson.version}.tgz`]) {
    rmSync(path.join(projectRoot, entry), { force: true });
  }
  rmSync(tempRoot, { recursive: true, force: true });
}
