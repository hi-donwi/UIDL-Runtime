import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { DataError, isDataError } from "../errors";
import { createInMemoryAdapter } from "../adapters/inMemory";
import type { DataAdapter, Mutation, Query } from "../types";

export interface MockHttpServerOptions {
  adapter?: DataAdapter;
  seed?: Record<string, Array<Record<string, unknown>>>;
  host?: string;
  port?: number;
  basePath?: string;
}

export interface RunningMockHttpServer {
  server: Server;
  url: string;
  close: () => Promise<void>;
}

const CODE_TO_STATUS: Record<DataError["code"], number> = {
  validation: 400,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  timeout: 408,
  network: 502,
  server: 500,
};

export function createDataAdapterHttpHandler(adapter: DataAdapter, basePath = "/api") {
  const normalizedBase = `/${basePath.replace(/^\/+|\/+$/g, "")}`;

  return async function handleDataAdapterRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      setCorsHeaders(res);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (req.method === "GET" && url.pathname === `${normalizedBase}/health`) {
        writeJson(res, 200, { status: "ok" });
        return;
      }
      if (!url.pathname.startsWith(normalizedBase)) {
        writeJson(res, 404, { error: { code: "not_found", message: "Route not found" } });
        return;
      }

      const segments = url.pathname
        .slice(normalizedBase.length)
        .split("/")
        .filter(Boolean)
        .map(decodeURIComponent);

      if (req.method === "POST" && segments.length === 1 && segments[0] === "query") {
        writeJson(res, 200, await adapter.query((await readJson(req)) as Query));
        return;
      }

      if (segments[0] === "records") {
        await handleRecordRoute(adapter, req, res, segments);
        return;
      }

      if (req.method === "POST" && segments[0] === "reports" && segments[1]) {
        const body = (await readJson(req)) as { params?: Record<string, unknown> };
        writeJson(res, 200, await adapter.report(segments[1], body.params ?? {}));
        return;
      }

      writeJson(res, 404, { error: { code: "not_found", message: "Route not found" } });
    } catch (error) {
      writeError(res, error);
    }
  };
}

export async function startMockHttpServer(options: MockHttpServerOptions = {}): Promise<RunningMockHttpServer> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;
  const adapter = options.adapter ?? createInMemoryAdapter({ seed: options.seed });
  const server = createServer(createDataAdapterHttpHandler(adapter, options.basePath ?? "/api"));

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new DataError("Mock server did not expose a TCP address", "server");
  const url = `http://${address.address}:${address.port}`;
  return {
    server,
    url,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function handleRecordRoute(adapter: DataAdapter, req: IncomingMessage, res: ServerResponse, segments: string[]): Promise<void> {
  const collection = segments[1];
  const id = segments[2];
  if (!collection) throw new DataError("collection is required", "validation", { collection: "Required" });

  if (req.method === "GET" && id && segments.length === 3) {
    const found = await adapter.get(collection, id);
    if (!found) throw new DataError(`Record "${id}" not found in "${collection}"`, "not_found");
    writeJson(res, 200, found);
    return;
  }

  if (req.method === "POST" && !id && segments.length === 2) {
    const body = (await readJson(req)) as Mutation;
    writeJson(res, 201, await adapter.create({ ...body, collection }));
    return;
  }

  if (req.method === "PATCH" && id && segments.length === 3) {
    const body = (await readJson(req)) as Mutation;
    writeJson(res, 200, await adapter.update({ ...body, collection, id }));
    return;
  }

  if (req.method === "DELETE" && id && segments.length === 3) {
    await adapter.remove(collection, id);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && id && segments[3] === "transition" && segments.length === 4) {
    const body = (await readJson(req)) as Mutation & { transition?: string };
    if (!body.transition) throw new DataError("transition is required", "validation", { transition: "Required" });
    writeJson(res, 200, await adapter.transition({ ...body, collection, id, transition: body.transition }));
    return;
  }

  writeJson(res, 404, { error: { code: "not_found", message: "Route not found" } });
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new DataError("Invalid JSON request body", "validation", { body: "Invalid JSON" });
  }
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function writeError(res: ServerResponse, error: unknown): void {
  const dataError = isDataError(error) ? error : new DataError(error instanceof Error ? error.message : "Server error", "server");
  writeJson(res, CODE_TO_STATUS[dataError.code], {
    error: {
      code: dataError.code,
      message: dataError.message,
      fields: dataError.fields,
    },
  });
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
}
