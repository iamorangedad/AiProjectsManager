import http from "node:http";
import { replaceIfNewer, read, validateProjects, withLock, type Project } from "./store.js";

export const DEFAULT_PORT = 47821;

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 2_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function startHttp(): http.Server {
  const port = Number(process.env.AI_PROJECTS_PORT || DEFAULT_PORT);
  const server = http.createServer((req, res) => {
    void handle(req, res);
  });
  server.on("error", (error) => {
    console.error(`[ai-projects-manager] sync API failed: ${error.message}`);
  });
  server.listen(port, "127.0.0.1", () => {
    console.error(`[ai-projects-manager] sync API http://127.0.0.1:${port}`);
  });
  return server;
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, { ok: true });
      return;
    }
    if (url.pathname !== "/api/projects") {
      send(res, 404, { error: "Not found" });
      return;
    }
    if (req.method === "GET") {
      const store = await withLock(() => read());
      send(res, 200, store);
      return;
    }
    if (req.method === "PUT") {
      const raw = await readBody(req);
      const parsed = JSON.parse(raw) as unknown;
      const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as { projects?: unknown; updatedAt?: unknown }) : null;
      const projectsRaw = Array.isArray(parsed) ? parsed : body?.projects;
      const projects = validateProjects(projectsRaw);
      if (!projects) {
        send(res, 400, { error: "Invalid projects payload" });
        return;
      }
      const updatedAt = typeof body?.updatedAt === "number" ? body.updatedAt : Date.now();
      const result = await withLock(() => replaceIfNewer(projects as Project[], updatedAt));
      send(res, result.accepted ? 200 : 409, result.store);
      return;
    }
    send(res, 405, { error: "Method not allowed" });
  } catch (error) {
    send(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
