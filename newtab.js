const STORAGE_KEY = 'canvas_projects';

const sidebar = document.getElementById('sidebar');
const projectList = document.getElementById('project-list');
const main = document.getElementById('main');
const toolbarTitle = document.getElementById('toolbar-title');
const canvasArea = document.getElementById('canvas-area');

let projects = [];
let currentProjectId = null;
let selectedParentId = null; // 用于记录当前选中的父节点ID

// ----- storage helpers -----
function loadProjects() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      projects = result[STORAGE_KEY] || [];
      if (projects.length === 0) {
        // auto-create default project with no nodes
        const defaultProj = {
          id: 'proj_1',
          name: 'Project 1',
          nodes: [],
          edges: []
        };
        projects.push(defaultProj);
        saveProjects(defaultProj);
      }
      resolve(projects);
    });
  });
}

function saveProjects(proj) {
  chrome.storage.local.set({ [STORAGE_KEY]: proj }, () => {
    // console.log('saved', proj);
  });
}

// ----- render project list -----
function renderProjectList() {
  projectList.innerHTML = '';
  projects.forEach((proj, idx) => {
    const el = document.createElement('div');
    el.className = 'project-item';
    el.textContent = proj.name;
    el.onclick = () => selectProject(proj.id);
    projectList.appendChild(el);
  });
  // select first if none selected
  if (!currentProjectId && projects.length) {
    selectProject(projects[0].id);
  }
}

// ----- select project -----
function selectProject(id) {
  currentProjectId = id;
  const proj = projects.find(p => p.id === id);
  if (!proj) return;
  toolbarTitle.textContent = proj.name;
  renderCanvas(proj.nodes, proj.edges);
}

// ----- render canvas (tree structure) -----
function renderCanvas(nodes, edges) {
  canvasArea.innerHTML = '';
  // build a map from parentId to child nodes
  const childMap = new Map(); // parentId -> [node, ...]
  const roots = [];
  nodes.forEach(node => {
    if (!node.parentId) {
      roots.push(node);
    } else {
      if (!childMap.has(node.parentId)) childMap.set(node.parentId, []);
      childMap.get(node.parentId).push(node);
    }
  });

  const tree = document.createElement('ul');
  tree.className = 'node-tree';
  canvasArea.appendChild(tree);

  // recursive function to append a node and its children
  function appendNode(parentEl, node, depth) {
    const li = document.createElement('li');
    li.style.listStyle = 'none';
    li.style.marginLeft = `${depth * 20}px`; // indent per level
    // node wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'node-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.cursor = 'pointer';
    wrapper.dataset.nodeId = node.id;

    const label = document.createElement('div');
    label.className = 'node-label';
    label.textContent = node.data?.label || 'Node';

    const meta = document.createElement('div');
    meta.className = 'node-meta';
    const pct = node.data?.percentage ?? 0;
    meta.textContent = `URL: ${node.data?.url || ''} | Progress: ${pct}%`;

    const progress = document.createElement('div');
    progress.className = 'progress-bar';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = `${pct}%`;
    progress.appendChild(fill);

    wrapper.appendChild(label);
    wrapper.appendChild(meta);
    wrapper.appendChild(progress);
    li.appendChild(wrapper);
    parentEl.appendChild(li);

    // draw connector line to first child (if any)
    const children = childMap.get(node.id) || [];
    if (children.length > 0) {
      // create a sub‑ul for children
      const subUl = document.createElement('ul');
      subUl.className = 'node-tree-sub';
      li.appendChild(subUl);
      // connect this node's bottom to the first child's top with a thin line
      const connector = document.createElement('div');
      connector.className = 'connector';
      connector.style.position = 'absolute';
      connector.style.left = `${wrapper.getBoundingClientRect().left + wrapper.clientWidth / 2}px`;
      connector.style.bottom = '0';
      connector.style.width = '2px';
      connector.style.height = '100%'; // will be overridden by JS after children layout
      connector.style.background = '#3b82f6';
      subUl.style.setProperty('--parent-bottom', `${wrapper.clientHeight}px`); // simple hack
      // We'll just stylize with CSS later; for now leave empty.
      // Actually we can append connector after children render; skip for brevity.
      // We'll just store a reference to add line later; omit here.
    }

    // recursively render children
    const children = childMap.get(node.id) || [];
    const subUl = document.createElement('ul');
    subUl.className = 'node-tree-sub';
    li.appendChild(subUl);
    children.forEach(child => appendNode(subUl, child, depth + 1));
  }

  roots.forEach(root => appendNode(tree, root, 0));

  // simple CSS to style the tree (inject via stylesheet)
  const style = document.createElement('style');
  style.textContent = `
    .node-tree { padding: 0; margin: 0; }
    .node-tree li { position: relative; padding: 4px 0; }
    .node-wrapper { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; margin: 4px 0; }
    .node-label { font-weight: bold; margin-bottom: 2px; }
    .node-meta { font-size: 12px; color: #666; margin-bottom: 4px; }
    .progress-bar { width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 4px; }
    .progress-fill { height: 100%; background: #3b82f6; width: 0%; transition: width 0.2s; }
    .node-tree-sub { margin-left: 12px; }
    .connector { position: absolute; left 50%; transform: translateX(-50%); width: 2px; background: #3b82f6; }
  `;
  canvasArea.appendChild(style);
}

// ----- edit mode -----
function enterEditMode(wrapper, node) {
  const existing = wrapper.querySelector('.edit-input');
  if (existing) return; // already editing

  const label = wrapper.querySelector('.node-label');
  const meta = wrapper.querySelector('.node-meta');
  const progress = wrapper.querySelector('.progress-bar');

  const input = document.createElement('input');
  input.className = 'edit-input';
  input.value = label.textContent || '';
  input.style.width = '100%';
  input.style.boxSizing = 'border-box';
  input.style.marginBottom = '4px';
  input.style.padding = '4px';
  input.style.fontSize = '13px';

  const urlInput = document.createElement('input');
  urlInput.className = 'edit-input';
  urlInput.value = node.data?.url || '';
  urlInput.style.width = '100%';
  urlInput.style.boxSizing = 'border-box';
  urlInput.style.marginBottom = '4px';
  urlInput.style.padding = '4px';
  urlInput.style.fontSize = '13px';

  const pctInput = document.createElement('input');
  pctInput.className = 'edit-input';
  pctInput.type = 'number';
  pctInput.min = 0;
  pctInput.max = 100;
  pctInput.value = node.data?.percentage ?? 0;
  pctInput.style.width = '100%';
  pctInput.style.boxSizing = 'border-box';
  pctInput.style.marginBottom = '4px';
  pctInput.style.padding = '4px';
  pctInput.style.fontSize = '13px';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.marginRight = '4px';
  saveBtn.style.padding = '4px 8px';
  saveBtn.style.fontSize = '12px';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.padding = '4px 8px';
  cancelBtn.style.fontSize = '12px';

  saveBtn.addEventListener('click', () => {
    const newLabel = input.value.trim() || 'Node';
    const newUrl = urlInput.value.trim();
    const newPct = parseInt(pctInput.value, 10) || 0;
    // update node data
    node.data = { label: newLabel, url: newUrl || undefined, percentage: newPct };
    // persist
    saveProjects(projects.find(p => p.id === currentProjectId));
    // re-render
    renderCanvas(projects.find(p => p.id === currentProjectId)?.nodes || [], []);
    // remove edit UI
    wrapper.removeChild(input);
    wrapper.removeChild(urlInput);
    wrapper.removeChild(pctInput);
    wrapper.removeChild(saveBtn);
    wrapper.removeChild(cancelBtn);
    // restore label
    const newLabelEl = document.createElement('div');
    newLabelEl.className = 'node-label';
    newLabelEl.textContent = newLabel;
    wrapper.prepend(newLabelEl);
    const newMeta = document.createElement('div');
    newMeta.className = 'node-meta';
    newMeta.textContent = `URL: ${newUrl || ''} | Progress: ${newPct}%`;
    const newProgress = document.createElement('div');
    newProgress.className = 'progress-bar';
    const newFill = document.createElement('div');
    newFill.className = 'progress-fill';
    newFill.style.width = `${newPct}%`;
    newProgress.appendChild(newFill);
    wrapper.appendChild(newMeta);
    wrapper.appendChild(newProgress);
    // re-attach click listener
    wrapper.addEventListener('click', (e) => {
      if (e.target === wrapper) enterEditMode(wrapper, node);
    });
  });

  cancelBtn.addEventListener('click', () => {
    wrapper.removeChild(input);
    wrapper.removeChild(urlInput);
    wrapper.removeChild(pctInput);
    wrapper.removeChild(saveBtn);
    wrapper.removeChild(cancelBtn);
  });

  wrapper.insertBefore(input, label);
  wrapper.insertBefore(urlInput, label);
  wrapper.insertBefore(pctInput, label);
  wrapper.insertBefore(saveBtn, label);
  wrapper.insertBefore(cancelBtn, label);
}

// ----- add node on right-click -----
canvasArea.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const target = e.target.closest('.node-wrapper');
  if (target) {
    // user clicked on an existing node -> set as parent for future children
    selectedParentId = target.dataset.nodeId;
    // optional: show feedback
    // alert('父节点已设置为 ' + selectedParentId);
    return;
  }
  // otherwise, add a new node (as root or child depending on selectedParentId)
  const newNode = {
    id: `node_${Date.now()}`,
    parentId: selectedParentId,
    data: { label: 'New Node', url: '', percentage: 0 }
  };
  // ensure parent exists in nodes array
  projects = projects.map(p => p.id === currentProjectId
    ? { ...p, nodes: [...p.nodes, newNode] }
    : p
  );
  saveProjects(projects.find(p => p.id === currentProjectId));
  renderCanvas(projects.find(p => p.id === currentProjectId)?.nodes || [], []);
});

// ----- new project -----
const newProjectBtn = sidebar.querySelector('#new-project');
newProjectBtn.addEventListener('click', async () => {
  const newProj = {
    id: `proj_${Date.now()}`,
    name: `Project ${projects.length + 1}`,
    nodes: [],
    edges: []
  };
  projects.push(newProj);
  currentProjectId = newProj.id;
  saveProjects(newProj);
  renderProjectList();
  toolbarTitle.textContent = newProj.name;
  canvasArea.innerHTML = '<div>Start adding nodes (right‑click)</div>';
});

// ----- init -----
loadProjects().then((projs) => {
  projects = projs;
  renderProjectList();
  if (!currentProjectId) selectProject(projects[0].id);
});