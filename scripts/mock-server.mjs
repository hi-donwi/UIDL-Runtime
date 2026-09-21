import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { startMockHttpServer } = require("../packages/core/src/data/testing/mockHttpServer.ts");
const { seed } = require("../packages/templates/src/mock-data/seed.ts");

const host = process.env.MOCK_API_HOST ?? "127.0.0.1";
const port = Number(process.env.MOCK_API_PORT ?? process.env.PORT ?? 8787);
const running = await startMockHttpServer({ seed, host, port, basePath: "/api" });

console.log(`uidl-runtime mock API listening at ${running.url}/api`);

const shutdown = async () => {
  await running.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
