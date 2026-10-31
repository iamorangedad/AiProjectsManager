#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { startHttp } from "./http.js";
import {
  addNode,
  connectNodes,
  createProject,
  dataFilePath,
  deleteNode,
  deleteProject,
  describeProject,
  disconnectNodes,
  findProject,
  read,
  renameProject,
  summarize,
  updateNode,
  withLock,
} from "./store.js";

const httpServer = startHttp();
const server = new McpServer({
  name: "ai-projects-manager",
  version: "1.0.0",
  title: "AI Projects Manager",
});

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

const projectField = z.string().describe("Project id or unique project name");

server.registerTool(
  "list_projects",
  {
    title: "List projects",
    description: "List canvas projects with their ids and how many nodes and edges each one has.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      const text = await withLock(() => summarize(read()));
      return ok(text);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "get_project",
  {
    title: "Get project",
    description: "Return one project's nodes, edges, and a parent-to-child outline. Match by id or unique name.",
    inputSchema: { project: projectField },
    annotations: { readOnlyHint: true },
  },
  async ({ project }) => {
    try {
      const text = await withLock(() => {
        const found = findProject(read(), project);
        return `${describeProject(found)}\n\n${JSON.stringify(found, null, 2)}`;
      });
      return ok(text);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "describe_project",
  {
    title: "Describe project",
    description: "Text outline of a project graph. Roots are nodes with no incoming edge; children follow connections.",
    inputSchema: { project: projectField },
    annotations: { readOnlyHint: true },
  },
  async ({ project }) => {
    try {
      const text = await withLock(() => describeProject(findProject(read(), project)));
      return ok(text);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "create_project",
  {
    title: "Create project",
    description: "Create an empty canvas project and return its id.",
    inputSchema: { name: z.string().describe("Display name of the new project") },
  },
  async ({ name }) => {
    try {
      const project = await withLock(() => createProject(name));
      return ok(`Created project "${project.name}" (${project.id})`);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "rename_project",
  {
    title: "Rename project",
    description: "Rename a canvas project.",
    inputSchema: {
      project: projectField,
      name: z.string().describe("New project name"),
    },
  },
  async ({ project, name }) => {
    try {
      const updated = await withLock(() => renameProject(project, name));
      return ok(`Renamed project ${updated.id} to "${updated.name}"`);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "delete_project",
  {
    title: "Delete project",
    description: "Delete a canvas project and all of its nodes and edges.",
    inputSchema: { project: projectField },
    annotations: { destructiveHint: true },
  },
  async ({ project }) => {
    try {
      const name = await withLock(() => deleteProject(project));
      return ok(`Deleted project "${name}"`);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "add_node",
  {
    title: "Add node",
    description: "Add a node to a project. Position defaults to the right of the current rightmost node. URL values without a scheme get https://.",
    inputSchema: {
      project: projectField,
      label: z.string().describe("Node title shown on the canvas"),
      url: z.string().optional().describe("Optional link opened from the node"),
      percentage: z.number().min(0).max(100).optional().describe("Progress from 0 to 100. Defaults to 0"),
      x: z.number().optional().describe("Canvas x position"),
      y: z.number().optional().describe("Canvas y position"),
    },
  },
  async ({ project, label, url, percentage, x, y }) => {
    try {
      const node = await withLock(() => addNode(project, { label, url, percentage, x, y }));
      return ok(`Added node "${node.data.label}" (${node.id}) at (${node.position.x}, ${node.position.y})`);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "update_node",
  {
    title: "Update node",
    description: "Change a node's label, URL, progress, or position. Pass an empty url to clear the link.",
    inputSchema: {
      project: projectField,
      nodeId: z.string().describe("Node id"),
      label: z.string().optional(),
      url: z.string().optional().describe("New URL, or an empty string to clear it"),
      percentage: z.number().min(0).max(100).optional(),
      x: z.number().optional(),
      y: z.number().optional(),
    },
  },
  async ({ project, nodeId, label, url, percentage, x, y }) => {
    try {
      const node = await withLock(() => updateNode(project, nodeId, { label, url, percentage, x, y }));
      return ok(`Updated node "${node.data.label}" (${node.id}), progress ${node.data.percentage}%`);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "delete_node",
  {
    title: "Delete node",
    description: "Delete a node and every edge connected to it.",
    inputSchema: {
      project: projectField,
      nodeId: z.string().describe("Node id"),
    },
    annotations: { destructiveHint: true },
  },
  async ({ project, nodeId }) => {
    try {
      const label = await withLock(() => deleteNode(project, nodeId));
      return ok(`Deleted node "${label}" (${nodeId})`);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "connect_nodes",
  {
    title: "Connect nodes",
    description: "Draw an edge from a source node (right handle) to a target node (left handle). A duplicate pair is left unchanged.",
    inputSchema: {
      project: projectField,
      sourceId: z.string().describe("Node id where the edge starts"),
      targetId: z.string().describe("Node id where the edge ends"),
    },
  },
  async ({ project, sourceId, targetId }) => {
    try {
      const { edge, created } = await withLock(() => connectNodes(project, sourceId, targetId));
      const verb = created ? "Connected" : "Already connected";
      return ok(`${verb} ${sourceId} → ${targetId} (${edge.id})`);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "disconnect_nodes",
  {
    title: "Disconnect nodes",
    description: "Remove an edge by its id, or by the source and target node ids.",
    inputSchema: {
      project: projectField,
      edgeId: z.string().optional().describe("Edge id"),
      sourceId: z.string().optional(),
      targetId: z.string().optional(),
    },
    annotations: { destructiveHint: true },
  },
  async ({ project, edgeId, sourceId, targetId }) => {
    try {
      const removed = await withLock(() => disconnectNodes(project, { edgeId, sourceId, targetId }));
      return ok(`Removed ${removed} connection${removed === 1 ? "" : "s"}`);
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerResource(
  "projects",
  "ai-projects://graph",
  {
    title: "Project graph",
    description: "Full canvas data: projects, nodes, edges, and updatedAt. Same shape the extension imports.",
    mimeType: "application/json",
  },
  async (uri) => {
    const store = await withLock(() => read());
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(store, null, 2),
        },
      ],
    };
  },
);

process.stdin.on("close", () => {
  httpServer.close();
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[ai-projects-manager] MCP ready, data file ${dataFilePath()}`);
