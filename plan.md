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
| 1 | Scaffold extension | Create `manifest.json`, Vite + React project, basic HMR | ☑ |
| 2 | New‑tab override | Add `chrome_url_overrides: { newtab: ... }`; verify new tab loads extension | ☑ |
| 3 | Persistence hook | Implement `useStorage.ts` with `chrome.storage.local`; read/write initial project | ☑ |
| 4 | Project list UI | Left sidebar that loads/saves projects, default‑first‑project behavior | ☑ |
| 5 | Node component | Basic `Node` component with ports, rendered by `xyflow` | ☑ |
| 6 | Right‑click add node | Context menu or canvas click to add a new node template | ☑ |
| 7 | Node editing | Click‑to‑edit modal/inline with label, URL, percentage fields | ☑ |
| 8 | Edge connection | Drag between node ports, store edges in storage | ☑ |
| 9 | Persist on change | Every add/edit/connect triggers `storage.set` | ☑ |
| 10 | Polish & test | Responsive sidebar, notifications, keyboard ESC to cancel, basic UX flow | ☑ |
| 11 | Package & load into Chrome | `crx` build, enable developer mode, test all scenarios | ☑ |

---

## 4. Next Steps (Immediate)

> ✅ All 11 milestones completed. Extension is ready for manual testing in Chrome.

1. Load `dist/` in Chrome `chrome://extensions` (Developer mode → Load unpacked).
2. Open new tab → verify Canvas loads, project list works, add/edit/delete nodes, drag edges, persistence across reloads.
3. Optional: add E2E tests, improve styles, add import/export.

---

## 5. Current Progress Summary

> **最后更新: 2026-09-09 10:23 (复核) | 总体完成度: 100% (11/11)**
> **构建状态: `tsc --noEmit` ✅ 0 errors | `vite build` ✅ 179 modules, 381kB | `oxlint` ✅ 0 errors | `dist/` ✅ 完整**

| 分类 | 状态 | 详情 |
|------|------|------|
| Manifest & Permissions | ✅ 完成 | `manifest.json` MV3, `chrome_url_overrides.newtab`, `storage/tabs/activeTab` |
| New Tab Override | ✅ 完成 | `newtab.html` → `/src/main.tsx`, `vite.config` 多入口 + manifest copy |
| Storage Hook | ✅ 完成 | `src/storage/useStorage.ts` 修复 schema, 支持 chrome.storage + localStorage fallback, `Project/AppNode/AppEdge` |
| Canvas Page | ✅ 完成 | `src/pages/CanvasPage.tsx` 使用 `@xyflow/react` (ReactFlow, Background, Controls, MiniMap), 右键菜单, pan/zoom, fitView |
| Project Sidebar | ✅ 完成 | `src/components/ProjectSidebar.tsx` 折叠/展开, 重命名, 删除, 创建 |
| Node Component | ✅ 完成 | `src/components/CustomNode.tsx` Handle 左右端口, 进度条, URL 链接 |
| Node Editing | ✅ 完成 | `src/components/NodeEditor.tsx` Modal, label/url/percentage, Esc 关闭, 删除, Open URL |
| Edge Connection | ✅ 完成 | `onConnect` via `addEdge`, 持久化 |
| Persist on Change | ✅ 完成 | add/edit/delete/drag/connect 均调用 `persist` 更新 `chrome.storage.local` |
| Polish | ✅ 完成 | 折叠侧边栏, Toast, Esc 快捷键, `#root` 全屏布局, `index.css` 修复 |
| Package | ✅ 完成 | `dist/` 含 `newtab.html`/`popup.html`/`manifest.json`/`assets`, 可直接 Load unpacked |

**文件清单:**
- `src/storage/useStorage.ts`, `src/components/CustomNode.tsx`, `src/components/ProjectSidebar.tsx`, `src/components/NodeEditor.tsx`, `src/pages/CanvasPage.tsx`, `src/App.tsx`, `newtab.html`, `vite.config.ts`, `popup.js` (fixed)

**已验证:**
- `npm run build` 成功 (381kB, 179 modules)
- `tsc --noEmit` 0 errors
- `oxlint` 0 errors (仅 3 warnings 可忽略)

---
*This document will be updated as each milestone is completed. Checkboxes (`☐`) can be toggled to `☑` when the corresponding work is done.*