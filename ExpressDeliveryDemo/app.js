// =====================================================
// 快遞物流最短配送系統 — 核心邏輯（支援使用者自訂地圖）
// 演算法：Dijkstra / Bellman-Ford / TSP B&B / Greedy / DP
// =====================================================

// --- 動態圖形資料 ---
let nodes = [];
let edges = [];
let nextNodeId = 1;

// --- DOM 元素 ---
const canvas = document.getElementById('cityMap');
const ctx = canvas.getContext('2d');
const startNodeSelect = document.getElementById('startNode');
const destinationsGrid = document.getElementById('destinationsGrid');
const calculateBtn = document.getElementById('calculateBtn');
const clearBtn = document.getElementById('clearBtn');
const resultSection = document.getElementById('resultSection');
const minTimeResult = document.getElementById('minTimeResult');
const routeDisplay = document.getElementById('routeDisplay');
const segmentDetails = document.getElementById('segmentDetails');
const resetViewBtn = document.getElementById('resetViewBtn');
const algoInfo = document.getElementById('algoInfo');
const algoInfoTitle = document.getElementById('algoInfoTitle');
const algoInfoContent = document.getElementById('algoInfoContent');
const spAlgoUsed = document.getElementById('spAlgoUsed');
const tspAlgoUsed = document.getElementById('tspAlgoUsed');
const nodeCountEl = document.getElementById('nodeCount');
const edgeCountEl = document.getElementById('edgeCount');
const statusText = document.getElementById('statusText');
const edgeModal = document.getElementById('edgeModal');
const edgeWeightInput = document.getElementById('edgeWeightInput');
const edgeModalDesc = document.getElementById('edgeModalDesc');
const edgeModalConfirm = document.getElementById('edgeModalConfirm');
const edgeModalCancel = document.getElementById('edgeModalCancel');

// 工具按鈕
const toolSelect = document.getElementById('toolSelect');
const toolAddNode = document.getElementById('toolAddNode');
const toolAddEdge = document.getElementById('toolAddEdge');
const toolDelete = document.getElementById('toolDelete');
const toolLoadExample = document.getElementById('toolLoadExample');
const toolClearAll = document.getElementById('toolClearAll');

// --- 相機 ---
let camera = { x: 0, y: 0, zoom: 1 };
let isDraggingCamera = false;
let cameraDragStart = { x: 0, y: 0 };

// --- 工具狀態 ---
let currentTool = 'select'; // select, addNode, addEdge, delete
let edgeSourceNode = null;  // 新增邊時暫存的第一個節點
let draggingNode = null;    // 拖曳中的節點

// --- 動畫 ---
let currentRoute = null;
let animationProgress = 0;
let animationReq = null;

// =====================================================
// 初始化
// =====================================================
function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 畫布事件
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('wheel', onCanvasWheel);
    canvas.addEventListener('dblclick', onCanvasDoubleClick);

    // 工具列
    toolSelect.addEventListener('click', () => setTool('select'));
    toolAddNode.addEventListener('click', () => setTool('addNode'));
    toolAddEdge.addEventListener('click', () => setTool('addEdge'));
    toolDelete.addEventListener('click', () => setTool('delete'));
    toolLoadExample.addEventListener('click', loadExample);
    toolClearAll.addEventListener('click', clearAllGraph);

    // 按鈕
    resetViewBtn.addEventListener('click', centerGraph);
    calculateBtn.addEventListener('click', handleCalculate);
    clearBtn.addEventListener('click', handleClearResult);

    // 對話框
    edgeModalCancel.addEventListener('click', () => { edgeModal.style.display = 'none'; edgeSourceNode = null; });
    edgeModalConfirm.addEventListener('click', confirmAddEdge);
    edgeWeightInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddEdge(); });

    setStatus('請使用上方工具列建立城市地圖，或點擊「載入範例」快速開始');
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    drawGraph();
}

// =====================================================
// 工具切換
// =====================================================
function setTool(tool) {
    currentTool = tool;
    edgeSourceNode = null;
    [toolSelect, toolAddNode, toolAddEdge, toolDelete].forEach(b => b.classList.remove('active'));
    const map = { select: toolSelect, addNode: toolAddNode, addEdge: toolAddEdge, delete: toolDelete };
    if (map[tool]) map[tool].classList.add('active');

    // 更新游標和提示
    const cursors = {
        select: 'grab',
        addNode: 'crosshair',
        addEdge: 'pointer',
        delete: 'pointer'
    };
    canvas.style.cursor = cursors[tool] || 'default';

    const tips = {
        select: '拖曳節點來移動位置，拖曳空白處平移地圖',
        addNode: '點擊畫布上的任意位置來新增城市節點',
        addEdge: '依序點擊兩個城市節點來新增一條道路',
        delete: '點擊節點或邊的權重標籤來刪除'
    };
    setStatus(tips[tool] || '');
    drawGraph();
}

function setStatus(text) {
    statusText.textContent = text;
}

// =====================================================
// 畫布座標轉換
// =====================================================
function screenToWorld(sx, sy) {
    return {
        x: (sx - camera.x) / camera.zoom,
        y: (sy - camera.y) / camera.zoom
    };
}

function worldToScreen(wx, wy) {
    return {
        x: wx * camera.zoom + camera.x,
        y: wy * camera.zoom + camera.y
    };
}

// =====================================================
// 命中測試
// =====================================================
function hitTestNode(wx, wy) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = n.x - wx, dy = n.y - wy;
        if (dx * dx + dy * dy <= 26 * 26) return n;
    }
    return null;
}

function hitTestEdge(wx, wy) {
    for (const e of edges) {
        const s = nodes.find(n => n.id === e.source);
        const t = nodes.find(n => n.id === e.target);
        if (!s || !t) continue;
        const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
        const dx = mx - wx, dy = my - wy;
        if (dx * dx + dy * dy <= 20 * 20) return e;
    }
    return null;
}

// =====================================================
// 畫布事件
// =====================================================
function onCanvasMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);

    if (currentTool === 'select') {
        const node = hitTestNode(w.x, w.y);
        if (node) {
            draggingNode = node;
            canvas.style.cursor = 'grabbing';
        } else {
            isDraggingCamera = true;
            cameraDragStart = { x: e.clientX - camera.x, y: e.clientY - camera.y };
            canvas.style.cursor = 'grabbing';
        }
    } else if (currentTool === 'addNode') {
        addNode(w.x, w.y);
    } else if (currentTool === 'addEdge') {
        const node = hitTestNode(w.x, w.y);
        if (node) {
            if (!edgeSourceNode) {
                edgeSourceNode = node;
                setStatus(`已選擇「城市 ${node.id}」作為起點，請點擊另一個城市`);
                drawGraph();
            } else if (node.id !== edgeSourceNode.id) {
                // 檢查是否已有此邊
                const exists = edges.find(e =>
                    (e.source === edgeSourceNode.id && e.target === node.id) ||
                    (e.target === edgeSourceNode.id && e.source === node.id)
                );
                if (exists) {
                    setStatus('這兩個城市之間已有道路！');
                    edgeSourceNode = null;
                } else {
                    showEdgeModal(edgeSourceNode, node);
                }
            }
        }
    } else if (currentTool === 'delete') {
        const node = hitTestNode(w.x, w.y);
        if (node) {
            deleteNode(node.id);
        } else {
            const edge = hitTestEdge(w.x, w.y);
            if (edge) deleteEdge(edge);
        }
    }
}

function onCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);

    if (draggingNode) {
        draggingNode.x = w.x;
        draggingNode.y = w.y;
        drawGraph();
    } else if (isDraggingCamera) {
        camera.x = e.clientX - cameraDragStart.x;
        camera.y = e.clientY - cameraDragStart.y;
        drawGraph();
    }
}

function onCanvasMouseUp() {
    if (draggingNode) {
        draggingNode = null;
        canvas.style.cursor = 'grab';
    }
    isDraggingCamera = false;
    if (currentTool === 'select') canvas.style.cursor = 'grab';
}

function onCanvasWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = camera.zoom * factor;
    if (newZoom > 0.2 && newZoom < 4) {
        // 以滑鼠位置為中心縮放
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        camera.x = mx - (mx - camera.x) * (newZoom / camera.zoom);
        camera.y = my - (my - camera.y) * (newZoom / camera.zoom);
        camera.zoom = newZoom;
    }
    drawGraph();
}

function onCanvasDoubleClick(e) {
    // 雙擊邊的權重標籤可編輯
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);
    const edge = hitTestEdge(w.x, w.y);
    if (edge) {
        const newWeight = prompt(`修改道路權重（目前：${edge.weight}）`, edge.weight);
        if (newWeight !== null) {
            const val = parseInt(newWeight);
            if (!isNaN(val) && val > 0) {
                edge.weight = val;
                drawGraph();
            }
        }
    }
}

// =====================================================
// 圖形操作
// =====================================================
function addNode(x, y) {
    const id = nextNodeId++;
    nodes.push({ id, label: `城市 ${id}`, x, y });
    refreshUI();
    setStatus(`已新增「城市 ${id}」，繼續點擊新增更多城市`);
    drawGraph();
}

function deleteNode(id) {
    nodes = nodes.filter(n => n.id !== id);
    edges = edges.filter(e => e.source !== id && e.target !== id);
    refreshUI();
    setStatus(`已刪除「城市 ${id}」及其連接的所有道路`);
    drawGraph();
}

function deleteEdge(edge) {
    edges = edges.filter(e => e !== edge);
    refreshUI();
    setStatus(`已刪除「城市 ${edge.source} — 城市 ${edge.target}」之間的道路`);
    drawGraph();
}

function showEdgeModal(src, tgt) {
    edgeModalDesc.textContent = `城市 ${src.id} ↔ 城市 ${tgt.id}`;
    edgeWeightInput.value = 1;
    edgeModal.style.display = 'flex';
    edgeModal._src = src;
    edgeModal._tgt = tgt;
    setTimeout(() => edgeWeightInput.focus(), 50);
}

function confirmAddEdge() {
    const w = parseInt(edgeWeightInput.value);
    if (isNaN(w) || w <= 0) {
        alert('請輸入正整數作為行駛時間！');
        return;
    }
    const src = edgeModal._src, tgt = edgeModal._tgt;
    edges.push({ source: src.id, target: tgt.id, weight: w });
    edgeModal.style.display = 'none';
    edgeSourceNode = null;
    refreshUI();
    setStatus(`已新增道路：城市 ${src.id} ↔ 城市 ${tgt.id}（時間 ${w}）`);
    drawGraph();
}

function loadExample() {
    nodes = [
        { id: 1, label: '城市 1', x: 480, y: 120 },
        { id: 2, label: '城市 2', x: 700, y: 200 },
        { id: 3, label: '城市 3', x: 280, y: 220 },
        { id: 4, label: '城市 4', x: 380, y: 420 },
        { id: 5, label: '城市 5', x: 680, y: 400 },
        { id: 6, label: '城市 6', x: 560, y: 570 },
        { id: 7, label: '城市 7', x: 340, y: 600 }
    ];
    edges = [
        { source: 1, target: 3, weight: 3 },
        { source: 1, target: 2, weight: 10 },
        { source: 1, target: 5, weight: 5 },
        { source: 2, target: 3, weight: 10 },
        { source: 2, target: 4, weight: 20 },
        { source: 2, target: 5, weight: 4 },
        { source: 3, target: 4, weight: 4 },
        { source: 3, target: 7, weight: 7 },
        { source: 4, target: 5, weight: 20 },
        { source: 4, target: 6, weight: 3 },
        { source: 4, target: 7, weight: 8 },
        { source: 5, target: 6, weight: 4 },
        { source: 6, target: 7, weight: 2 }
    ];
    nextNodeId = 8;
    handleClearResult();
    refreshUI();
    setStatus('已載入作業 PDF 圖 1 的範例地圖（7 個城市，13 條道路）');
    setTimeout(centerGraph, 50);
}

function clearAllGraph() {
    if (nodes.length > 0 && !confirm('確定要清除所有城市和道路嗎？')) return;
    nodes = [];
    edges = [];
    nextNodeId = 1;
    handleClearResult();
    refreshUI();
    setStatus('已清除所有資料，請重新建立地圖');
    drawGraph();
}

// =====================================================
// UI 更新
// =====================================================
function refreshUI() {
    nodeCountEl.textContent = nodes.length;
    edgeCountEl.textContent = edges.length;

    // 更新起點選擇器
    const prevStart = startNodeSelect.value;
    startNodeSelect.innerHTML = '';
    if (nodes.length === 0) {
        startNodeSelect.innerHTML = '<option value="">-- 請先建立城市 --</option>';
    } else {
        nodes.forEach(n => {
            const opt = document.createElement('option');
            opt.value = n.id;
            opt.textContent = n.label;
            startNodeSelect.appendChild(opt);
        });
        if (nodes.find(n => String(n.id) === prevStart)) {
            startNodeSelect.value = prevStart;
        }
    }

    // 更新目的地
    destinationsGrid.innerHTML = '';
    if (nodes.length === 0) {
        destinationsGrid.innerHTML = '<span class="empty-hint">請先在地圖上新增城市</span>';
    } else {
        nodes.forEach(n => {
            const div = document.createElement('div');
            div.className = 'dest-checkbox';
            div.innerHTML = `
                <input type="checkbox" id="dest-${n.id}" value="${n.id}">
                <label class="dest-label" for="dest-${n.id}">${n.label}</label>
            `;
            destinationsGrid.appendChild(div);
        });
    }
}

function centerGraph() {
    if (nodes.length === 0) {
        camera = { x: 0, y: 0, zoom: 1 };
        drawGraph();
        return;
    }
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const gw = (maxX - minX) || 200;
    const gh = (maxY - minY) || 200;
    const cx = minX + gw / 2, cy = minY + gh / 2;
    const sx = (canvas.width * 0.7) / gw;
    const sy = (canvas.height * 0.7) / gh;
    camera.zoom = Math.min(sx, sy, 2);
    camera.x = canvas.width / 2 - cx * camera.zoom;
    camera.y = canvas.height / 2 - cy * camera.zoom;
    drawGraph();
}

// =====================================================
// 演算法
// =====================================================
function buildAdjList() {
    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
        adj[e.source].push({ target: e.target, weight: e.weight });
        adj[e.target].push({ target: e.source, weight: e.weight });
    });
    return adj;
}

// Dijkstra
function dijkstra(startId, adj) {
    const dist = {}, prev = {};
    const visited = new Set();
    nodes.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
    dist[startId] = 0;

    for (let i = 0; i < nodes.length; i++) {
        let u = null, minD = Infinity;
        for (const n of nodes) {
            if (!visited.has(n.id) && dist[n.id] < minD) {
                minD = dist[n.id]; u = n.id;
            }
        }
        if (u === null) break;
        visited.add(u);
        for (const nb of (adj[u] || [])) {
            const alt = dist[u] + nb.weight;
            if (alt < dist[nb.target]) {
                dist[nb.target] = alt;
                prev[nb.target] = u;
            }
        }
    }
    return { dist, prev };
}

// Bellman-Ford
function bellmanFord(startId) {
    const dist = {}, prev = {};
    nodes.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
    dist[startId] = 0;
    for (let i = 0; i < nodes.length - 1; i++) {
        for (const e of edges) {
            if (dist[e.source] + e.weight < dist[e.target]) {
                dist[e.target] = dist[e.source] + e.weight;
                prev[e.target] = e.source;
            }
            if (dist[e.target] + e.weight < dist[e.source]) {
                dist[e.source] = dist[e.target] + e.weight;
                prev[e.source] = e.target;
            }
        }
    }
    return { dist, prev };
}

function computeAllPairs(algo) {
    const adj = buildAdjList();
    const result = {};
    nodes.forEach(n => {
        result[n.id] = algo === 'dijkstra' ? dijkstra(n.id, adj) : bellmanFord(n.id);
    });
    return result;
}

function getPath(u, v, allPaths) {
    const path = [];
    let curr = v;
    const prevMap = allPaths[u].prev;
    if (prevMap[curr] === null && u !== v) return [];
    while (curr !== null) { path.unshift(curr); curr = prevMap[curr]; }
    return path;
}

// TSP Branch-and-Bound
function tspBranchAndBound(startId, destIds, allPaths) {
    const n = destIds.length;
    let minCost = Infinity, bestPath = null;
    let nodesExplored = 0, pruneCount = 0;

    function lowerBound(currNode, unvisited) {
        let lb = 0;
        let minE = allPaths[currNode].dist[startId];
        for (const uid of unvisited) minE = Math.min(minE, allPaths[currNode].dist[uid]);
        lb += minE;
        for (const uid of unvisited) {
            let me = allPaths[uid].dist[startId];
            for (const vid of unvisited) if (vid !== uid) me = Math.min(me, allPaths[uid].dist[vid]);
            lb += me;
        }
        return lb;
    }

    function search(curr, visited, cost, path) {
        nodesExplored++;
        if (visited.size === n) {
            const total = cost + allPaths[curr].dist[startId];
            if (total < minCost) { minCost = total; bestPath = [...path, startId]; }
            return;
        }
        const unvisited = destIds.filter(d => !visited.has(d));
        if (cost + lowerBound(curr, unvisited) >= minCost) { pruneCount++; return; }
        for (const next of destIds) {
            if (!visited.has(next)) {
                visited.add(next);
                path.push(next);
                search(next, visited, cost + allPaths[curr].dist[next], path);
                visited.delete(next);
                path.pop();
            }
        }
    }
    search(startId, new Set(), 0, [startId]);
    return { cost: minCost, path: bestPath, nodesExplored, pruneCount };
}

// TSP Greedy (Nearest Neighbor)
function tspGreedy(startId, destIds, allPaths) {
    const unvisited = new Set(destIds);
    let curr = startId, cost = 0;
    const path = [startId];
    while (unvisited.size > 0) {
        let next = null, minE = Infinity;
        for (const d of unvisited) {
            const c = allPaths[curr].dist[d];
            if (c < minE) { minE = c; next = d; }
        }
        unvisited.delete(next);
        cost += minE;
        path.push(next);
        curr = next;
    }
    cost += allPaths[curr].dist[startId];
    path.push(startId);
    return { cost, path, nodesExplored: destIds.length, pruneCount: 0 };
}

// TSP DP (Held-Karp)
function tspDP(startId, destIds, allPaths) {
    const n = destIds.length;
    if (n > 20) {
        alert('動態規劃法最多支援 20 個目的地');
        return null;
    }
    const FULL = (1 << n) - 1;
    const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));
    const parent = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));
    for (let i = 0; i < n; i++) dp[1 << i][i] = allPaths[startId].dist[destIds[i]];
    for (let mask = 1; mask <= FULL; mask++) {
        for (let last = 0; last < n; last++) {
            if (!(mask & (1 << last)) || dp[mask][last] === Infinity) continue;
            for (let next = 0; next < n; next++) {
                if (mask & (1 << next)) continue;
                const nm = mask | (1 << next);
                const nc = dp[mask][last] + allPaths[destIds[last]].dist[destIds[next]];
                if (nc < dp[nm][next]) { dp[nm][next] = nc; parent[nm][next] = last; }
            }
        }
    }
    let minCost = Infinity, lastNode = -1;
    for (let i = 0; i < n; i++) {
        const t = dp[FULL][i] + allPaths[destIds[i]].dist[startId];
        if (t < minCost) { minCost = t; lastNode = i; }
    }
    const order = [];
    let mask = FULL, curr = lastNode;
    while (curr !== -1) { order.push(destIds[curr]); const p = parent[mask][curr]; mask ^= (1 << curr); curr = p; }
    order.reverse();
    const path = [startId, ...order, startId];
    return { cost: minCost, path, nodesExplored: (1 << n) * n, pruneCount: 0 };
}

// =====================================================
// 主控制
// =====================================================
function handleCalculate() {
    if (nodes.length < 2) { alert('請至少建立 2 個城市！'); return; }
    const startId = parseInt(startNodeSelect.value);
    if (isNaN(startId)) { alert('請選擇起始城市！'); return; }
    const checkedDests = Array.from(document.querySelectorAll('.dest-checkbox input:checked')).map(cb => parseInt(cb.value));
    if (checkedDests.length === 0) { alert('請至少選擇一個配送目的地！'); return; }
    const destIds = checkedDests.filter(id => id !== startId);
    if (destIds.length === 0) { alert('目的地不能與起點相同！'); return; }

    const spAlgo = document.getElementById('shortestPathAlgo').value;
    const tspAlgo = document.getElementById('tspAlgo').value;
    const allPaths = computeAllPairs(spAlgo);

    // 檢查可達性
    for (const d of destIds) {
        if (allPaths[startId].dist[d] === Infinity) {
            alert(`城市 ${startId} 無法到達城市 ${d}，請確認道路連接！`);
            return;
        }
    }

    let result;
    if (tspAlgo === 'branch-bound') result = tspBranchAndBound(startId, destIds, allPaths);
    else if (tspAlgo === 'greedy') result = tspGreedy(startId, destIds, allPaths);
    else result = tspDP(startId, destIds, allPaths);
    if (!result || result.cost === Infinity) { alert('無法找到有效路徑！'); return; }
    displayResult(result, allPaths, spAlgo, tspAlgo, startId, destIds);
}

function handleClearResult() {
    resultSection.style.display = 'none';
    algoInfo.style.display = 'none';
    currentRoute = null;
    if (animationReq) cancelAnimationFrame(animationReq);
    drawGraph();
}

function displayResult(result, allPaths, spAlgo, tspAlgo, startId, destIds) {
    const spNames = { 'dijkstra': 'Dijkstra 演算法', 'bellman-ford': 'Bellman-Ford 演算法' };
    const tspNames = { 'branch-bound': '分支定界法 (B&B)', 'greedy': '貪婪法 (NN)', 'dp': '動態規劃法 (DP)' };
    spAlgoUsed.textContent = spNames[spAlgo];
    tspAlgoUsed.textContent = tspNames[tspAlgo];
    minTimeResult.textContent = result.cost + ' 單位時間';

    routeDisplay.innerHTML = '';
    result.path.forEach((nodeId, i) => {
        const span = document.createElement('span');
        span.className = nodeId === startId ? 'route-node start-node' : destIds.includes(nodeId) ? 'route-node dest-node' : 'route-node';
        span.textContent = nodeId;
        routeDisplay.appendChild(span);
        if (i < result.path.length - 1) {
            const arrow = document.createElement('span');
            arrow.className = 'route-arrow';
            arrow.innerHTML = '&rarr;';
            routeDisplay.appendChild(arrow);
        }
    });

    segmentDetails.innerHTML = '';
    const fullPhysicalPath = [];
    for (let i = 0; i < result.path.length - 1; i++) {
        const u = result.path[i], v = result.path[i + 1];
        const seg = getPath(u, v, allPaths);
        const segCost = allPaths[u].dist[v];
        const div = document.createElement('div');
        div.className = 'segment-item';
        div.innerHTML = `<strong>第 ${i + 1} 段：</strong>城市 ${u} → 城市 ${v}｜實際路徑：${seg.join(' → ')}｜時間：<strong>${segCost}</strong>`;
        segmentDetails.appendChild(div);
        if (i === 0) fullPhysicalPath.push(...seg);
        else { seg.shift(); fullPhysicalPath.push(...seg); }
    }

    currentRoute = { logicalPath: result.path, physicalPath: fullPhysicalPath };

    algoInfoTitle.textContent = `${tspNames[tspAlgo]} 執行資訊`;
    algoInfoContent.innerHTML = '';
    [`搜尋節點數：${result.nodesExplored}`, `修剪次數：${result.pruneCount}`, `最優解：${result.cost}`, `路線：${result.path.join(' → ')}`].forEach((t, i) => {
        const d = document.createElement('div');
        d.className = 'step-item' + (i === 2 ? ' highlight' : '');
        d.textContent = t;
        algoInfoContent.appendChild(d);
    });
    algoInfo.style.display = 'block';
    resultSection.style.display = 'block';

    animationProgress = 0;
    if (animationReq) cancelAnimationFrame(animationReq);
    animateRoute();
}

// =====================================================
// Canvas 繪圖
// =====================================================
function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製格線背景
    drawGrid();

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    const startId = parseInt(startNodeSelect.value);
    const destIds = Array.from(document.querySelectorAll('.dest-checkbox input:checked')).map(cb => parseInt(cb.value));

    // 邊
    edges.forEach(e => {
        const s = nodes.find(n => n.id === e.source);
        const t = nodes.find(n => n.id === e.target);
        if (!s || !t) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
        ctx.fillStyle = 'rgba(10, 13, 26, 0.9)';
        ctx.beginPath();
        ctx.arc(mx, my, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.weight, mx, my);
    });

    // 新增邊時的高亮
    if (currentTool === 'addEdge' && edgeSourceNode) {
        const sn = nodes.find(n => n.id === edgeSourceNode.id);
        if (sn) {
            ctx.beginPath();
            ctx.arc(sn.x, sn.y, 30, 0, Math.PI * 2);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // 動畫路線
    if (currentRoute && currentRoute.physicalPath.length > 1) {
        const path = currentRoute.physicalPath;
        const totalSeg = path.length - 1;
        const curSegF = animationProgress * totalSeg;
        const curSeg = Math.floor(curSegF);
        const rem = curSegF - curSeg;

        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#10b981';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= curSeg && i < totalSeg; i++) {
            const p1 = nodes.find(n => n.id === path[i]);
            const p2 = nodes.find(n => n.id === path[i + 1]);
            if (!p1 || !p2) break;
            if (i === 0) ctx.moveTo(p1.x, p1.y);
            if (i === curSeg) ctx.lineTo(p1.x + (p2.x - p1.x) * rem, p1.y + (p2.y - p1.y) * rem);
            else ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (curSeg < totalSeg) {
            const p1 = nodes.find(n => n.id === path[curSeg]);
            const p2 = nodes.find(n => n.id === path[curSeg + 1]);
            if (p1 && p2) {
                const vx = p1.x + (p2.x - p1.x) * rem, vy = p1.y + (p2.y - p1.y) * rem;
                ctx.beginPath(); ctx.arc(vx, vy, 16, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; ctx.fill();
                ctx.beginPath(); ctx.arc(vx, vy, 9, 0, Math.PI * 2);
                ctx.fillStyle = '#10b981'; ctx.fill();
            }
        }
    }

    // 節點
    nodes.forEach(n => {
        const isStart = n.id === startId;
        const isDest = destIds.includes(n.id);
        if (isStart || isDest) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, 30, 0, Math.PI * 2);
            ctx.fillStyle = isStart ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)';
            ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = isStart ? '#6366f1' : isDest ? '#f59e0b' : '#334155';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = isStart ? '#818cf8' : isDest ? '#fbbf24' : 'rgba(255,255,255,0.12)';
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.id, n.x, n.y);
    });

    ctx.restore();
}

function drawGrid() {
    const gridSize = 50 * camera.zoom;
    const offsetX = camera.x % gridSize;
    const offsetY = camera.y % gridSize;
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function animateRoute() {
    animationProgress += 0.004;
    if (animationProgress > 1) { animationProgress = 1; drawGraph(); return; }
    drawGraph();
    animationReq = requestAnimationFrame(animateRoute);
}

// 啟動
init();
