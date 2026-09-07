const STORAGE_KEY = 'canvas_projects';

const sidebar = document.getElementById('sidebar');
const projectList = document.getElementById('project-list');
const main = document.getElementById('main');
const toolbarTitle = document.getElementById('toolbar-title');
const canvasArea = document.getElementById('canvas-area');

let projects = [];
let currentProjectId = null;

// ----- storage helpers -----
function loadProjects() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      projects = result[STORAGE_KEY] || [];
      if (projects.length === 0) {
        // auto-create default project
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

// ----- render canvas -----
function renderCanvas(nodes, edges) {
  canvasArea.innerHTML = '';
  // draw nodes
  nodes.forEach(node => {
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

    // make node editable on click (single click toggles edit)
    let editing = false;
    wrapper.addEventListener('click', (e) => {
      if (editing) return;
      if (e.target === wrapper) {
        enterEditMode(wrapper, node);
      }
    });

    canvasArea.appendChild(wrapper);
  });

  // draw edges
  edges.forEach(edge => {
    const fromNode = nodes.find(n => n.id === edge.fromNodeId);
    const toNode = nodes.find(n => n.id === edge.toNodeId);
    if (!fromNode || !toNode) return;

    const fromWrapper = canvasArea.querySelector(`.node-wrapper[data-node-id="${edge.fromNodeId}"]`);
    const toWrapper = canvasArea.querySelector(`.node-wrapper[data-node-id="${edge.toNodeId}"]`);
    if (!fromWrapper || !toWrapper) return;

    // simple line between centers for demo
    const fromRect = fromWrapper.getBoundingClientRect();
    const toRect = toWrapper.getBoundingClientRect();
    const line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.border = '2px solid #3b82f6';
    line.style.width = '100px'; // placeholder
    line.style.height = '2px';
    line.style.background = '#3b82f6';
    line.style.pointerEvents = 'none';
    // rough positioning
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    line.style.width = `${len}px`;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    line.style.transform = `rotate(${angle}deg)`;
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    canvasArea.appendChild(line);
  });
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
  editing = true;
}

// ----- add node on right-click -----
canvasArea.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvasArea.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const newNode = {
    id: `node_${Date.now()}`,
    data: { label: 'New Node', url: '', percentage: 0 }
  };
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
  canvasArea.innerHTML = '<div>Start adding nodes (right-click)</div>';
});

// ----- init -----
loadProjects().then((projs) => {
  projects = projs;
  renderProjectList();
  if (!currentProjectId) selectProject(projects[0].id);
});