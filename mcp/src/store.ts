import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface NodeData {
  label: string;
  url?: string;
  percentage: number;
  [key: string]: unknown;
}

export interface AppNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

export interface AppEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface Project {
  id: string;
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
}

export interface StoreFile {
  updatedAt: number;
  projects: Project[];
}

const dataPath =
  process.env.AI_PROJECTS_DATA ||
  path.join(os.homedir(), ".local", "share", "ai-projects-manager", "projects.json");

let queue: Promise<unknown> = Promise.resolve();

export function dataFilePath(): string {
  return dataPath;
}

export function withLock<T>(fn: () => T): Promise<T> {
  const run = queue.then(() => fn());
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function emptyStore(): StoreFile {
  return { updatedAt: 0, projects: [] };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function validateProjects(raw: unknown): Project[] | null {
  if (!Array.isArray(raw)) return null;
  const projects: Project[] = [];
  for (const item of raw) {
    const project = asRecord(item);
    if (!project || typeof project.id !== "string" || typeof project.name !== "string") return null;
    if (!Array.isArray(project.nodes) || !Array.isArray(project.edges)) return null;
    const nodes: AppNode[] = [];
    for (const nodeRaw of project.nodes) {
      const node = asRecord(nodeRaw);
      const position = node ? asRecord(node.position) : null;
      const data = node ? asRecord(node.data) : null;
      if (!node || typeof node.id !== "string" || !position || !data) return null;
      if (typeof position.x !== "number" || typeof position.y !== "number") return null;
      if (typeof data.label !== "string") return null;
      const percentage = typeof data.percentage === "number" ? clampPercent(data.percentage) : 0;
      const url = typeof data.url === "string" && data.url.trim() ? data.url : undefined;
      const extra: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (key === "label" || key === "url" || key === "percentage") continue;
        extra[key] = value;
      }
      nodes.push({
        id: node.id,
        type: typeof node.type === "string" ? node.type : "custom",
        position: { x: position.x, y: position.y },
        data: { ...extra, label: data.label, url, percentage },
      });
    }
    const edges: AppEdge[] = [];
    for (const edgeRaw of project.edges) {
      const edge = asRecord(edgeRaw);
      if (!edge || typeof edge.id !== "string" || typeof edge.source !== "string" || typeof edge.target !== "string") return null;
      edges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle as string | null | undefined,
        targetHandle: edge.targetHandle as string | null | undefined,
      });
    }
    projects.push({ id: project.id, name: project.name, nodes, edges });
  }
  return projects;
}

export function read(): StoreFile {
  let raw: string;
  try {
    raw = fs.readFileSync(dataPath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyStore();
    throw new Error(`Cannot read project data at ${dataPath}: ${(error as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Project data at ${dataPath} is not valid JSON: ${(error as Error).message}`);
  }
  if (Array.isArray(parsed)) {
    const projects = validateProjects(parsed);
    if (!projects) throw new Error(`Project data at ${dataPath} does not match the canvas schema`);
    return { updatedAt: 0, projects };
  }
  const obj = asRecord(parsed);
  const projects = obj ? validateProjects(obj.projects) : null;
  if (!obj || !projects) throw new Error(`Project data at ${dataPath} does not match the canvas schema`);
  const updatedAt = typeof obj.updatedAt === "number" && Number.isFinite(obj.updatedAt) ? obj.updatedAt : 0;
  return { updatedAt, projects };
}

export function write(store: StoreFile): void {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  const tmp = `${dataPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(store, null, 2)}\n`);
  fs.renameSync(tmp, dataPath);
}

export function replaceIfNewer(projects: Project[], updatedAt: number): { accepted: boolean; store: StoreFile } {
  const current = read();
  const incomingTs = Number.isFinite(updatedAt) ? updatedAt : Date.now();
  if (current.projects.length > 0 && incomingTs < current.updatedAt) {
    return { accepted: false, store: current };
  }
  const next = { projects, updatedAt: incomingTs };
  write(next);
  return { accepted: true, store: next };
}

export function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeUrl(url: string | undefined): string | undefined {
  if (url == null) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function findProject(store: StoreFile, project: string): Project {
  const byId = store.projects.find((item) => item.id === project);
  if (byId) return byId;
  const byName = store.projects.filter((item) => item.name === project);
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) throw new Error(`Multiple projects named "${project}". Pass the project id instead.`);
  throw new Error(`Project not found: ${project}`);
}

export function summarize(store: StoreFile): string {
  if (store.projects.length === 0) return "No projects.";
  const lines = store.projects.map(
    (project) => `- ${project.name} (${project.id}) — ${project.nodes.length} nodes, ${project.edges.length} edges`,
  );
  return `${store.projects.length} project${store.projects.length === 1 ? "" : "s"}\n\n${lines.join("\n")}`;
}

export function describeProject(project: Project): string {
  const byId = new Map(project.nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();
  const incoming = new Set<string>();
  for (const edge of project.edges) {
    const list = children.get(edge.source) ?? [];
    list.push(edge.target);
    children.set(edge.source, list);
    incoming.add(edge.target);
  }
  const lines: string[] = [`${project.name} (${project.id}) — ${project.nodes.length} nodes, ${project.edges.length} edges`];
  const seen = new Set<string>();
  const walk = (id: string, depth: number) => {
    const node = byId.get(id);
    if (!node) return;
    const url = node.data.url ? ` <${node.data.url}>` : "";
    const cycle = seen.has(id) ? " (already listed)" : "";
    lines.push(`${"  ".repeat(depth)}- ${node.data.label} [${node.data.percentage}%]${url}${cycle} id=${node.id}`);
    if (seen.has(id)) return;
    seen.add(id);
    for (const child of children.get(id) ?? []) walk(child, depth + 1);
  };
  const roots = project.nodes.filter((node) => !incoming.has(node.id));
  for (const root of roots) walk(root.id, 0);
  for (const node of project.nodes) {
    if (!seen.has(node.id)) walk(node.id, 0);
  }
  if (project.nodes.length === 0) lines.push("(empty canvas)");
  return lines.join("\n");
}

function touch(store: StoreFile): void {
  store.updatedAt = Date.now();
  write(store);
}

export function createProject(name: string): Project {
  const store = read();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Project name is required");
  const project: Project = { id: uid("p"), name: trimmed, nodes: [], edges: [] };
  store.projects.push(project);
  touch(store);
  return project;
}

export function renameProject(projectKey: string, name: string): Project {
  const store = read();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Project name is required");
  const project = findProject(store, projectKey);
  project.name = trimmed;
  touch(store);
  return project;
}

export function deleteProject(projectKey: string): string {
  const store = read();
  const project = findProject(store, projectKey);
  store.projects = store.projects.filter((item) => item.id !== project.id);
  touch(store);
  return project.name;
}

export function addNode(
  projectKey: string,
  input: { label: string; url?: string; percentage?: number; x?: number; y?: number },
): AppNode {
  const store = read();
  const project = findProject(store, projectKey);
  const label = input.label.trim();
  if (!label) throw new Error("Node label is required");
  const node: AppNode = {
    id: uid("n"),
    type: "custom",
    position: placeNode(project, input.x, input.y),
    data: {
      label,
      url: normalizeUrl(input.url),
      percentage: input.percentage == null ? 0 : clampPercent(input.percentage),
    },
  };
  project.nodes.push(node);
  touch(store);
  return node;
}

function placeNode(project: Project, x?: number, y?: number): { x: number; y: number } {
  if (x != null && y != null) return { x, y };
  if (project.nodes.length === 0) return { x: x ?? 80, y: y ?? 80 };
  const right = Math.max(...project.nodes.map((node) => node.position.x));
  const row = project.nodes.length % 4;
  return { x: x ?? right + 260, y: y ?? 80 + row * 140 };
}

export function updateNode(
  projectKey: string,
  nodeId: string,
  patch: { label?: string; url?: string; percentage?: number; x?: number; y?: number },
): AppNode {
  const store = read();
  const project = findProject(store, projectKey);
  const node = project.nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  if (patch.label != null) {
    const label = patch.label.trim();
    if (!label) throw new Error("Node label cannot be empty");
    node.data.label = label;
  }
  if (patch.url != null) node.data.url = normalizeUrl(patch.url);
  if (patch.percentage != null) node.data.percentage = clampPercent(patch.percentage);
  if (patch.x != null) node.position.x = patch.x;
  if (patch.y != null) node.position.y = patch.y;
  touch(store);
  return node;
}

export function deleteNode(projectKey: string, nodeId: string): string {
  const store = read();
  const project = findProject(store, projectKey);
  const node = project.nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  project.nodes = project.nodes.filter((item) => item.id !== nodeId);
  project.edges = project.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
  touch(store);
  return node.data.label;
}

export function connectNodes(projectKey: string, sourceId: string, targetId: string): { edge: AppEdge; created: boolean } {
  const store = read();
  const project = findProject(store, projectKey);
  if (sourceId === targetId) throw new Error("A node cannot connect to itself");
  if (!project.nodes.some((node) => node.id === sourceId)) throw new Error(`Source node not found: ${sourceId}`);
  if (!project.nodes.some((node) => node.id === targetId)) throw new Error(`Target node not found: ${targetId}`);
  const existing = project.edges.find((edge) => edge.source === sourceId && edge.target === targetId);
  if (existing) return { edge: existing, created: false };
  const edge: AppEdge = { id: uid("e"), source: sourceId, target: targetId };
  project.edges.push(edge);
  touch(store);
  return { edge, created: true };
}

export function disconnectNodes(projectKey: string, input: { edgeId?: string; sourceId?: string; targetId?: string }): number {
  const store = read();
  const project = findProject(store, projectKey);
  const before = project.edges.length;
  if (input.edgeId) {
    project.edges = project.edges.filter((edge) => edge.id !== input.edgeId);
  } else if (input.sourceId && input.targetId) {
    project.edges = project.edges.filter((edge) => !(edge.source === input.sourceId && edge.target === input.targetId));
  } else {
    throw new Error("Pass edgeId, or both sourceId and targetId");
  }
  const removed = before - project.edges.length;
  if (removed === 0) throw new Error("Connection not found");
  touch(store);
  return removed;
}
