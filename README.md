# Canvas Diagram Tool — AI Projects Manager

A Chrome Extension (MV3) that replaces the New Tab page with a diagram canvas for managing AI projects. Create projects, add nodes, connect them with edges, track progress, and keep everything persisted even when browser data is cleared.

## Features

- **New Tab Override** — Every new tab opens the canvas (`chrome_url_overrides`)
- **Project Management** — Left sidebar with create / rename / delete / select; auto-creates `Project 1` on first run
- **Canvas (React Flow / xyflow)** — Pan, zoom, minimap, controls, `fitView`
- **Nodes** — Right-click canvas → *Add Node here* or `+ Add Node` button; drag to reposition; click to edit
- **Node Editing** — Modal with label, URL (auto-normalizes to `https://`), progress 0–100% with bar; `Esc` to close; delete & open URL
- **Edges** — Drag handle-to-handle to connect; arrow markers; click edge or press `Del`/`Backspace` to delete; context menu on edge
- **Collapse / Expand** — `−`/`+` on nodes with children hides/shows all descendants (BFS); header shows `visible / hidden / edges` and `Expand all`
- **Resilient Persistence** — Quad-redundant storage survives browser data clearing (see below)
- **Import / Export** — One-click JSON backup in sidebar
<img width="1254" height="760" alt="image" src="https://github.com/user-attachments/assets/657c448e-a0c2-4752-bb5d-c883f7bb9846" />

## Tech Stack

React 19 + TypeScript 6 + Vite 8 + `@xyflow/react` 12 + `oxlint`

## Storage — Survives "Clear Browsing Data"

`chrome.storage.local` (extension storage) is isolated from site data and is **not** cleared by normal *Clear browsing data → Cookies and site data*. On top of that the app writes every change to 4 backends in parallel and restores the newest/best copy on load:

| Backend | Purpose |
|---|---|
| `chrome.storage.local` | Primary, durable, `unlimitedStorage` |
| `IndexedDB` (`ai-projects-manager` / `kv`) | Secondary, large quota, `navigator.storage.persist()` |
| `chrome.storage.sync` | Google-account synced (skipped if >80KB) |
| `localStorage` | Fallback for dev outside extension |

Load strategy: read all 4 with timestamps → pick newest; tie-break by total nodes+edges → heal missing backends by re-persisting. Sidebar `Export` / `Import` gives a file-level backup that survives even full extension storage wipe.

Code: `src/storage/useStorage.ts` + `src/storage/idb.ts`

## Project Structure

```
manifest.json
newtab.html / popup.html / popup.js
vite.config.ts
src/
  main.tsx / App.tsx
  pages/CanvasPage.tsx        # ReactFlow, context menus, persistence wiring
  components/
    ProjectSidebar.tsx
    CustomNode.tsx            # handles, progress bar, collapse toggle
    NodeEditor.tsx
  storage/
    useStorage.ts             # quad persistence + export/import
    idb.ts
```

## Getting Started

```bash
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build  → dist/
npm run lint     # oxlint
```

## Load in Chrome

1. `npm run build`
2. Open `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select `dist/`
4. Open a new tab — the canvas appears

## Usage

- **Add node:** right-click canvas → *Add Node here* or click `+ Add Node`
- **Edit node:** click a node → edit label/URL/percentage → *Save*
- **Connect:** drag from right handle to left handle of another node
- **Delete edge:** click an edge → *Delete connection* or select + `Del`
- **Delete node:** in edit modal → *Delete* or select + `Del` (incident edges removed)
- **Collapse:** click `−` on a node with children; `+` to expand; header `Expand all` to reset
- **Switch projects:** click a project in the sidebar
- **Backup:** sidebar `⤓ Export` downloads `ai-projects-YYYY-MM-DD.json`; `⤒ Import` restores

## Data Schema

```json
{
  "projects": [
    {
      "id": "p1",
      "name": "Project 1",
      "nodes": [{ "id": "n1", "type": "custom", "position": { "x": 100, "y": 200 }, "data": { "label": "Start", "url": "https://example.com", "percentage": 0 } }],
      "edges": [{ "id": "e1", "source": "n1", "target": "n2" }]
    }
  ]
}
```

## Permissions (MV3)

`storage`, `tabs`, `activeTab`, `unlimitedStorage` + `chrome_url_overrides: { newtab: "newtab.html" }`

## Build Output

`dist/` contains `newtab.html`, `popup.html`, `manifest.json`, `assets/` — ready for *Load unpacked* or packing as `.crx`.

## License

MIT
