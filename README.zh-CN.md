# Canvas Diagram Tool — AI 项目管理

[English](README.md)

这是一个 Chrome 扩展（MV3），用来在图布上规划工作。可以创建项目、把任务节点连起来，并在右侧向模型提问。当前版本是 **v1.1.0**。

**[从 Chrome 网上应用店安装 Canvas Diagram Tool](https://chromewebstore.google.com/detail/canvas-diagram-tool/hpeakcadccgijjmimdnofpkgdfaibnap)**

![画布上的研究计划，右侧详情面板打开了一个模型节点](docs/canvas.png)

## 功能

- **工具栏** — 扩展图标在新标签页打开画布
- **项目** — 在左侧边栏创建、重命名、删除和切换项目。第一次打开会创建 `Project 1`。列表最宽为窗口的四分之一
- **画布** — 平移、缩放、缩略图和控制按钮。初始视图保持正常比例，卡片不会被放大
- **任务节点** — 标题、备注、网址和进度滑块。已经以 `http://` 或 `https://` 开头的地址保持原样。没有协议的公网地址会补上 `https://`。`localhost` 和内网地址会补上 `http://`
- **模型节点** — 通过已保存的连接提问。可以改写模型名称，回答保存在该节点上
- **上游上下文** — 模型节点提问时，每个上游节点的标题、备注、链接、进度和已有回答会写入 system 消息。请求体本身只有 `model` 和 `messages`
- **设置** — 保存兼容 OpenAI 的连接。Key 只留在这个浏览器里，不会写进项目导出文件
- **连线** — 从一个节点的右侧连接点连到另一个节点的左侧连接点
- **折叠** — 隐藏或显示一个节点的全部后代。顶栏显示可见节点、隐藏节点和连线数量
- **详情面板** — 在右侧编辑，最宽为窗口的一半，`Esc` 关闭
- **持久化** — 画布保存四份副本，并支持 JSON 导出和导入（见下文）

## 技术栈

React 19 + TypeScript 6 + Vite 8 + `@xyflow/react` 12 + `oxlint`

## 存储 — 清理浏览数据后仍然保留

`chrome.storage.local` 是扩展自己的存储。普通的「清除浏览数据 → Cookie 及网站数据」不会删掉它。每次修改还会同时写入四个位置，加载时取最新且仍然有内容的一份：

| 位置 | 作用 |
|---|---|
| `chrome.storage.local` | 主副本，并申请了 `unlimitedStorage` |
| `IndexedDB`（`ai-projects-manager` / `kv`） | 第二份，并调用 `navigator.storage.persist()` |
| `chrome.storage.sync` | 跟 Google 账号同步的副本；超过 80KB 时跳过 |
| `localStorage` | 不在扩展里打开页面时的备用 |

加载时读取这四份，保留时间戳最新的一份。时间戳相同时，节点和连线更多的一份优先。较新但内容为空的副本，不会覆盖一份较旧、但里面还有内容的副本。缺失的副本会被补写回去。侧边栏的 `Export` / `Import` 是文件备份。API key 单独存放，不包含在这个文件里。

代码：`src/storage/useStorage.ts`、`src/storage/idb.ts`、`src/storage/pickSnapshot.ts`、`src/storage/llmSettings.ts`

## 项目结构

```
manifest.json
background.js                 # 点击工具栏图标时打开画布
newtab.html
vite.config.ts
src/
  main.tsx / App.tsx
  pages/CanvasPage.tsx        # 画布、菜单和面板
  components/
    ProjectSidebar.tsx
    CustomNode.tsx            # 任务或模型卡片，以及折叠按钮
    NodeEditor.tsx            # 右侧详情和提问
    SettingsPanel.tsx
    PanelResizeHandle.tsx
  canvas/
    collapse.ts
    panelWidth.ts
  llm/callModel.ts            # 兼容 OpenAI 的对话请求
  storage/
    useStorage.ts
    nodeData.ts
    parentHistory.ts
    llmSettings.ts
    idb.ts
    pickSnapshot.ts
```

## 开始使用

```bash
npm install
npm run dev      # Vite 开发服务器。打开 /newtab.html
npm run build    # tsc -b && vite build  → dist/
npm run lint     # oxlint
```

## MCP

`mcp/` 里的 MCP 服务让 Cursor（或其他 MCP 客户端）读取和修改画布使用的同一份项目图：项目、节点、进度和连线。

```bash
npm run mcp:install
npm run mcp:build
```

项目配置在 `.cursor/mcp.json`。构建完成后，在 Cursor 里重新加载 MCP 服务。服务使用 stdio，同时监听 `http://127.0.0.1:47821`，扩展运行时可以与它同步。

数据文件：`~/.local/share/ai-projects-manager/projects.json`（可用 `AI_PROJECTS_DATA` 改路径）。

工具：`list_projects`、`get_project`、`describe_project`、`create_project`、`rename_project`、`delete_project`、`add_node`、`update_node`、`delete_node`、`connect_nodes`、`disconnect_nodes`。资源：`ai-projects://graph`。

拉取这些改动后，重新构建并重新加载扩展，画布页面才能访问同步接口。MCP 服务没有运行时，画布继续使用自己的存储。

## 在 Chrome 中加载

从 [Chrome 网上应用店](https://chromewebstore.google.com/detail/canvas-diagram-tool/hpeakcadccgijjmimdnofpkgdfaibnap) 安装已发布的扩展。

也可以加载本地构建：

1. `npm run build`
2. 打开 `chrome://extensions`，打开**开发者模式**
3. 选择**加载已解压的扩展程序**，选中 `dist/`
4. 点击扩展图标，画布会在一个标签页中打开

第一次保存或调用模型连接时，Chrome 会询问是否允许访问该地址。

## 用法

- **添加任务：** `+ Add Node`，或在画布上右键 → *Add Node here*
- **添加模型节点：** 在画布上右键 → *Add model node*，再在详情里设置类型
- **编辑：** 点击节点，改完后点 *Save*
- **提问：** 在模型节点上选择连接并发送问题
- **删除连线：** 点击连线 → *Delete connection*，或选中后按 `Del` / `Backspace`
- **删除节点：** 在详情里点 *Delete*，或选中后按 `Del`。相连的边会一起删除
- **折叠：** `−` 隐藏后代，`+` 展开，顶栏 `Expand all` 清除所有折叠
- **调整宽度：** 从右边拖项目列表，或从左边拖详情面板
- **备份：** `⤓ Export` 下载 `ai-projects-YYYY-MM-DD.json`。`⤒ Import` 用来恢复

### 模型连接

在 **Settings** 里添加对话接口能接受的连接。

| | Base URL | 模型 | API key |
|---|---|---|---|
| 云端，兼容 OpenAI | `https://api.openai.com/v1` | 模型 id | 必填 |
| Google AI Studio | `https://generativelanguage.googleapis.com/v1beta/openai` | 完整 id，例如 `gemini-3.8-flash` | 必填 |
| 本地，例如 Ollama | `http://127.0.0.1:11434/v1` | 本地模型名称 | 保持勾选 **Local model, no API key** |

插件会向 `{base URL}/chat/completions` 发请求。请使用服务商的完整模型 id。`gemini` 这样的短名称会被拒绝。

## 数据格式

```json
{
  "projects": [
    {
      "id": "p1",
      "name": "Project 1",
      "nodes": [
        {
          "id": "n1",
          "type": "custom",
          "position": { "x": 80, "y": 120 },
          "data": {
            "label": "Research",
            "url": "https://example.com/spec",
            "note": "Read the spec first",
            "percentage": 40
          }
        },
        {
          "id": "n2",
          "type": "custom",
          "position": { "x": 320, "y": 120 },
          "data": {
            "label": "Outline",
            "kind": "model",
            "percentage": 100,
            "profileId": "k1",
            "note": "Turn the research into an outline",
            "messages": [
              { "role": "user", "content": "What should the outline cover?" },
              { "role": "assistant", "content": "Scope, sources, and a first draft." }
            ]
          }
        }
      ],
      "edges": [{ "id": "e1", "source": "n1", "target": "n2" }]
    }
  ]
}
```

任务节点不写 `kind`。模型节点把 `kind` 设为 `"model"`。节点上的 `model` 是对连接所用模型的可选覆盖。

## 权限（MV3）

`storage`、`unlimitedStorage`

可选 MCP 同步接口的主机权限：`http://127.0.0.1:47821/*`

保存或调用连接时才会请求的可选主机权限：`https://*/*` 和 `http://*/*`

工具栏按钮打开 `newtab.html`。这个页面不会被安装成浏览器的新标签页。

## 构建产物

`dist/` 包含 `newtab.html`、`background.js`、`manifest.json`、`icons/` 和 `assets/`。可以加载这个文件夹，也可以打包成 `.crx`。

## 许可证

MIT
