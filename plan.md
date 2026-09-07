# Chrome Extension Plan: Canvas Diagram Tool

**Goal**: A Chrome extension that opens a canvas page on new tab, provides a left sidebar project list, node creation via right-click, node connections via edges, and editable nodes with URL and progress percentage.

---

## 1. Core Modules & Functionality

### 1.1 Manifest & Permissions (`manifest.json`)
- **Version**: MV3
- **Permissions**: `activeTab`, `storage`, `tabs`, `url-overrides`
- **Action**: Browser action (optional, for opening palette)
- **Host permissions**: none needed beyond default

### 1.2 New Tab Override (`chrome_url_overrides`)
- **Override**: `newtab`
- On every new tab opened, the extension's Canvas page loads automatically.

### 1.3 Canvas Page (`src/ canvas/` — React + Vite + `react-flow` / `xyflow`)
- **Layout**:
  - Left vertical sidebar (width ~200px) showing project list.
  - Main area (right) displaying the diagram canvas.
- **Canvas features**:
  - Pan/zoom.
  - Right-click → "Add Node" (opens a small modal or pre-defined node template).
  - Drag from node handles to connect nodes (edges).
- **Default behaviour**: On first load, if no projects exist, show a placeholder or auto-create "Project 1". The first project's canvas is displayed by default.

### 1.4 Project List (Left Sidebar)
- **Data stored** in `chrome.storage.local` as an array of project objects: `{ id, name, nodes[] }`.
- **UI**:
  - Clickable list items.
  - Each click replaces the canvas with that project's diagram.
  - "Add Project" button (optional, to create a new empty project).
- **Default**: If storage is empty, auto-create "Project 1" with empty node list and display its canvas.

### 1.5 Node Creation (Right‑Click)
- **Context menu** (or inline menu) on canvas background: "Add Node".
- **Node template**: minimal shape (e.g., rectangle) with ports (input/output handles).
- **Node properties** stored per node:
  - `id`, `type`, `position {x, y}`
  - `data`: `{ label, url?, percentage }`
- After creation, node appears at cursor position and is ready for editing.

### 1.6 Node Editing (Click)
- **Single click** on a node → enter "edit mode".
- **Inline editor** or modal appears with fields:
  - **Label** (text)
  - **URL** (optional; when filled, node can be clicked to open the URL in a new tab)
  - **Percentage** (0–100, displayed as progress bar or text)
- **Save** button applies changes and updates storage.
- Click outside or escape to cancel editing.

### 1.7 Node Connections (Edges)
- User can drag from an output handle of one node to an input handle of another.
- Edge stored as `{ fromNodeId, fromPort, toNodeId, toPort }`.
- Visual line rendered by `xyflow`.
- Connection validated (must be between valid ports).

### 1.8 Data Persistence (`chrome.storage.local`)
- **Schema**:
  ```json
  {
    "projects": [
      {
        "id": "p1",
        "name": "Project 1",
        "nodes": [
          { "id": "n1", "type": "input", "position": { x: 100, y: 200 }, "data": { label: "Start", url: "https://example.com", percentage: 0 } }
        ],
        "edges": []
      }
    ]
  }
  ```
- On any change (add node, edit, connect), `chrome.storage.local.set` is called to persist.
- On startup, `chrome.storage.local.get` loads the projects and renders the default first project.

### 1.9 Background Script (optional)
- Listen to `chrome.tabs.onCreated` (if not using `chrome_url_overrides` only) for any extra logic.
- Not strictly needed if new tab override handles everything.

### 1.10 UI Polish
- Responsive sidebar: collapse/expand button.
- Toast notifications for save success/failure.
- Keyboard shortcuts (e.g., `Esc` to exit edit mode).

---

## 2. File Structure (suggested)

```
AiProjectsManager/
├─ manifest.json
├─ vite.config.js
├─ index.html          ← entry for new-tab override (or use service worker)
├─ src/
│  ├─ main.tsx
│  ├─ pages/
│  │  ├─ CanvasPage.tsx      ← main canvas + xyflow
│  │  ├─ ProjectSidebar.tsx  ← project list UI
│  │  └─ NodeEditor.tsx      ← node click/edit + add node
│  ├─ components/
│  │  └─ Node.tsx            ← reusable node component
│  └─ storage/
│      └─ useStorage.ts      └─ chrome.storage.local hooks
├─ contextMenu.js            ← right‑click “Add Node” (optional)
└─ README.md (this plan)
```

---

## 3. Development Milestones (status tracking)

| # | Milestone | Description | Status |
|---|-----------|-------------|--------|
| 1 | Scaffold extension | Create `manifest.json`, Vite + React project, basic HMR | ☐ |
| 2 | New‑tab override | Add `chrome_url_overrides: { newtab: ... }`; verify new tab loads extension | ☐ |
| 3 | Persistence hook | Implement `useStorage.ts` with `chrome.storage.local`; read/write initial project | ☐ |
| 4 | Project list UI | Left sidebar that loads/saves projects, default‑first‑project behavior | ☐ |
| 5 | Node component | Basic `Node` component with ports, rendered by `xyflow` | ☐ |
| 6 | Right‑click add node | Context menu or canvas click to add a new node template | ☐ |
| 7 | Node editing | Click‑to‑edit modal/inline with label, URL, percentage fields | ☐ |
| 8 | Edge connection | Drag between node ports, store edges in storage | ☐ |
| 9 | Persist on change | Every add/edit/connect triggers `storage.set` | ☐ |
| 10 | Polish & test | Responsive sidebar, notifications, keyboard ESC to cancel, basic UX flow | ☐ |
| 11 | Package & load into Chrome | `crx` build, enable developer mode, test all scenarios | ☐ |

---

## 4. Next Steps (Immediate)

1. Run `npm create vite@latest ai-canvas -- --template react-ts` (or equivalent) inside `AiProjectsManager`.
2. Add `xyflow` (`npm i xyflow`) and `react-flow` style dependencies.
3. Create `manifest.json` with required permissions and `chrome_url_overrides`.
4. Implement `useStorage.ts` hook.
5. Build the CanvasPage skeleton with the left sidebar placeholder.

---
*This document will be updated as each milestone is completed. Checkboxes (`☐`) can be toggled to `☑` when the corresponding work is done.*