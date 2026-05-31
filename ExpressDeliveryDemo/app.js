// =====================================================
// 快遞物流最短配送系統 v2
// 演算法固定：Dijkstra + TSP Branch-and-Bound
// =====================================================

let nodes = [];
let edges = [];
let nextNodeId = 1;

// DOM
const canvas = document.getElementById('cityMap');
const ctx = canvas.getContext('2d');
const startNodeSelect = document.getElementById('startNode');
const destinationsGrid = document.getElementById('destinationsGrid');
const calculateBtn = document.getElementById('calculateBtn');
const clearBtn = document.getElementById('clearBtn');
const resultSection = document.getElementById('resultSection');
const minTimeResult = document.getElementById('minTimeResult');
const nodesExploredResult = document.getElementById('nodesExploredResult');
const pruneCountResult = document.getElementById('pruneCountResult');
const routeDisplay = document.getElementById('routeDisplay');
const segmentDetails = document.getElementById('segmentDetails');
const resetViewBtn = document.getElementById('resetViewBtn');
const algoInfo = document.getElementById('algoInfo');
const algoInfoTitle = document.getElementById('algoInfoTitle');
const algoInfoContent = document.getElementById('algoInfoContent');
const nodeCountEl = document.getElementById('nodeCount');
const edgeCountEl = document.getElementById('edgeCount');
const statusText = document.getElementById('statusText');
const edgeModal = document.getElementById('edgeModal');
const edgeWeightInput = document.getElementById('edgeWeightInput');
const edgeModalDesc = document.getElementById('edgeModalDesc');
const edgeModalConfirm = document.getElementById('edgeModalConfirm');
const edgeModalCancel = document.getElementById('edgeModalCancel');
const toolSelect = document.getElementById('toolSelect');
const toolAddNode = document.getElementById('toolAddNode');
const toolAddEdge = document.getElementById('toolAddEdge');
const toolDelete = document.getElementById('toolDelete');
const toolLoadExample = document.getElementById('toolLoadExample');
const toolClearAll = document.getElementById('toolClearAll');

let camera = { x: 0, y: 0, zoom: 1 };
let isDraggingCamera = false, cameraDragStart = { x: 0, y: 0 };
let currentTool = 'select';
let edgeSourceNode = null;
let draggingNode = null;
let currentRoute = null;
let animationProgress = 0;
let animationReq = null;

// =====================================================
// Init
// =====================================================
function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('wheel', onCanvasWheel);
    canvas.addEventListener('dblclick', onCanvasDblClick);
    toolSelect.addEventListener('click', () => setTool('select'));
    toolAddNode.addEventListener('click', () => setTool('addNode'));
    toolAddEdge.addEventListener('click', () => setTool('addEdge'));
    toolDelete.addEventListener('click', () => setTool('delete'));
    toolLoadExample.addEventListener('click', loadExample);
    toolClearAll.addEventListener('click', clearAll);
    resetViewBtn.addEventListener('click', centerGraph);
    calculateBtn.addEventListener('click', handleCalculate);
    clearBtn.addEventListener('click', handleClearResult);
    edgeModalCancel.addEventListener('click', () => { edgeModal.style.display = 'none'; edgeSourceNode = null; });
    edgeModalConfirm.addEventListener('click', confirmAddEdge);
    edgeWeightInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddEdge(); });
    setStatus('使用上方工具列建立城市地圖，或點擊「載入範例」快速開始');
}

function resizeCanvas() { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; drawGraph(); }
function setStatus(t) { statusText.textContent = t; }

function setTool(tool) {
    currentTool = tool; edgeSourceNode = null;
    [toolSelect, toolAddNode, toolAddEdge, toolDelete].forEach(b => b.classList.remove('active'));
    ({ select: toolSelect, addNode: toolAddNode, addEdge: toolAddEdge, delete: toolDelete })[tool]?.classList.add('active');
    canvas.style.cursor = { select: 'grab', addNode: 'crosshair', addEdge: 'pointer', delete: 'pointer' }[tool];
    setStatus({ select: '拖曳節點移動位置，拖曳空白處平移地圖', addNode: '點擊畫布任意位置新增城市', addEdge: '依序點擊兩個城市來新增道路', delete: '點擊節點或邊的權重來刪除' }[tool]);
    drawGraph();
}

// =====================================================
// Coordinate Helpers
// =====================================================
function screenToWorld(sx, sy) { return { x: (sx - camera.x) / camera.zoom, y: (sy - camera.y) / camera.zoom }; }
function hitNode(wx, wy) { for (let i = nodes.length - 1; i >= 0; i--) { const n = nodes[i], dx = n.x - wx, dy = n.y - wy; if (dx*dx+dy*dy <= 676) return n; } return null; }
function hitEdge(wx, wy) { for (const e of edges) { const s = nodes.find(n=>n.id===e.source), t = nodes.find(n=>n.id===e.target); if (!s||!t) continue; const mx=(s.x+t.x)/2,my=(s.y+t.y)/2,dx=mx-wx,dy=my-wy; if(dx*dx+dy*dy<=400) return e; } return null; }

// =====================================================
// Canvas Events
// =====================================================
function onCanvasMouseDown(e) {
    const r = canvas.getBoundingClientRect(), sx = e.clientX-r.left, sy = e.clientY-r.top, w = screenToWorld(sx, sy);
    if (currentTool === 'select') {
        const n = hitNode(w.x, w.y);
        if (n) { draggingNode = n; canvas.style.cursor = 'grabbing'; }
        else { isDraggingCamera = true; cameraDragStart = { x: e.clientX-camera.x, y: e.clientY-camera.y }; canvas.style.cursor = 'grabbing'; }
    } else if (currentTool === 'addNode') { addNode(w.x, w.y); }
    else if (currentTool === 'addEdge') {
        const n = hitNode(w.x, w.y);
        if (n) {
            if (!edgeSourceNode) { edgeSourceNode = n; setStatus(`已選「城市 ${n.id}」，請點擊另一個城市`); drawGraph(); }
            else if (n.id !== edgeSourceNode.id) {
                if (edges.find(e=>(e.source===edgeSourceNode.id&&e.target===n.id)||(e.target===edgeSourceNode.id&&e.source===n.id))) { setStatus('已有道路！'); edgeSourceNode = null; }
                else showEdgeModal(edgeSourceNode, n);
            }
        }
    } else if (currentTool === 'delete') {
        const n = hitNode(w.x, w.y);
        if (n) { nodes = nodes.filter(x=>x.id!==n.id); edges = edges.filter(x=>x.source!==n.id&&x.target!==n.id); refreshUI(); setStatus(`已刪除城市 ${n.id}`); drawGraph(); }
        else { const ed = hitEdge(w.x,w.y); if(ed){edges=edges.filter(x=>x!==ed);refreshUI();setStatus(`已刪除道路`);drawGraph();} }
    }
}
function onCanvasMouseMove(e) {
    if (draggingNode) { const r=canvas.getBoundingClientRect(),w=screenToWorld(e.clientX-r.left,e.clientY-r.top); draggingNode.x=w.x;draggingNode.y=w.y;drawGraph(); }
    else if (isDraggingCamera) { camera.x=e.clientX-cameraDragStart.x;camera.y=e.clientY-cameraDragStart.y;drawGraph(); }
}
function onCanvasMouseUp() { if(draggingNode){draggingNode=null;canvas.style.cursor='grab';}isDraggingCamera=false;if(currentTool==='select')canvas.style.cursor='grab'; }
function onCanvasWheel(e) {
    e.preventDefault(); const f=e.deltaY>0?0.92:1.08,nz=camera.zoom*f;
    if(nz>0.2&&nz<4){const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;camera.x=mx-(mx-camera.x)*(nz/camera.zoom);camera.y=my-(my-camera.y)*(nz/camera.zoom);camera.zoom=nz;}drawGraph();
}
function onCanvasDblClick(e) {
    const r=canvas.getBoundingClientRect(),w=screenToWorld(e.clientX-r.left,e.clientY-r.top),ed=hitEdge(w.x,w.y);
    if(ed){const nw=prompt(`修改權重（目前：${ed.weight}）`,ed.weight);if(nw!==null){const v=parseInt(nw);if(!isNaN(v)&&v>0){ed.weight=v;drawGraph();}}}
}

// =====================================================
// Graph Ops
// =====================================================
function addNode(x,y){const id=nextNodeId++;nodes.push({id,label:`城市 ${id}`,x,y});refreshUI();setStatus(`已新增城市 ${id}`);drawGraph();}
function showEdgeModal(src,tgt){edgeModalDesc.textContent=`城市 ${src.id} ↔ 城市 ${tgt.id}`;edgeWeightInput.value=1;edgeModal.style.display='flex';edgeModal._src=src;edgeModal._tgt=tgt;setTimeout(()=>edgeWeightInput.focus(),50);}
function confirmAddEdge(){const w=parseInt(edgeWeightInput.value);if(isNaN(w)||w<=0){alert('請輸入正整數！');return;}const s=edgeModal._src,t=edgeModal._tgt;edges.push({source:s.id,target:t.id,weight:w});edgeModal.style.display='none';edgeSourceNode=null;refreshUI();setStatus(`已新增道路：城市 ${s.id} ↔ 城市 ${t.id}（${w}）`);drawGraph();}
function loadExample(){nodes=[{id:1,label:'城市 1',x:480,y:120},{id:2,label:'城市 2',x:700,y:200},{id:3,label:'城市 3',x:280,y:220},{id:4,label:'城市 4',x:380,y:420},{id:5,label:'城市 5',x:680,y:400},{id:6,label:'城市 6',x:560,y:570},{id:7,label:'城市 7',x:340,y:600}];edges=[{source:1,target:3,weight:3},{source:1,target:2,weight:10},{source:1,target:5,weight:5},{source:2,target:3,weight:10},{source:2,target:4,weight:20},{source:2,target:5,weight:4},{source:3,target:4,weight:4},{source:3,target:7,weight:7},{source:4,target:5,weight:20},{source:4,target:6,weight:3},{source:4,target:7,weight:8},{source:5,target:6,weight:4},{source:6,target:7,weight:2}];nextNodeId=8;handleClearResult();refreshUI();setStatus('已載入範例地圖（7 城市 13 道路）');setTimeout(centerGraph,50);}
function clearAll(){if(nodes.length>0&&!confirm('確定清除所有？'))return;nodes=[];edges=[];nextNodeId=1;handleClearResult();refreshUI();setStatus('已清除');drawGraph();}

function refreshUI(){
    nodeCountEl.textContent=nodes.length;edgeCountEl.textContent=edges.length;
    const prev=startNodeSelect.value;startNodeSelect.innerHTML='';
    if(!nodes.length)startNodeSelect.innerHTML='<option value="">-- 請先建立城市 --</option>';
    else nodes.forEach(n=>{const o=document.createElement('option');o.value=n.id;o.textContent=n.label;startNodeSelect.appendChild(o);});
    if(nodes.find(n=>String(n.id)===prev))startNodeSelect.value=prev;
    destinationsGrid.innerHTML='';
    if(!nodes.length)destinationsGrid.innerHTML='<span class="empty-hint">請先新增城市</span>';
    else nodes.forEach(n=>{const d=document.createElement('div');d.className='dest-checkbox';d.innerHTML=`<input type="checkbox" id="dest-${n.id}" value="${n.id}"><label class="dest-label" for="dest-${n.id}">${n.label}</label>`;destinationsGrid.appendChild(d);});
}

function centerGraph(){
    if(!nodes.length){camera={x:0,y:0,zoom:1};drawGraph();return;}
    const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const gw=(maxX-minX)||200,gh=(maxY-minY)||200,cx=minX+gw/2,cy=minY+gh/2;
    camera.zoom=Math.min((canvas.width*0.7)/gw,(canvas.height*0.7)/gh,2);
    camera.x=canvas.width/2-cx*camera.zoom;camera.y=canvas.height/2-cy*camera.zoom;drawGraph();
}

// =====================================================
// Algorithms: Dijkstra + Branch-and-Bound (FIXED)
// =====================================================
function buildAdj(){const a={};nodes.forEach(n=>a[n.id]=[]);edges.forEach(e=>{a[e.source].push({t:e.target,w:e.weight});a[e.target].push({t:e.source,w:e.weight});});return a;}

function dijkstra(startId){
    const adj=buildAdj(),dist={},prev={},vis=new Set();
    nodes.forEach(n=>{dist[n.id]=Infinity;prev[n.id]=null;});dist[startId]=0;
    for(let i=0;i<nodes.length;i++){
        let u=null,m=Infinity;for(const n of nodes)if(!vis.has(n.id)&&dist[n.id]<m){m=dist[n.id];u=n.id;}
        if(u===null)break;vis.add(u);
        for(const nb of(adj[u]||[])){const alt=dist[u]+nb.w;if(alt<dist[nb.t]){dist[nb.t]=alt;prev[nb.t]=u;}}
    }
    return{dist,prev};
}

function computeAllPairs(){const r={};nodes.forEach(n=>{r[n.id]=dijkstra(n.id);});return r;}
function getPath(u,v,ap){const p=[];let c=v;const pm=ap[u].prev;if(pm[c]===null&&u!==v)return[];while(c!==null){p.unshift(c);c=pm[c];}return p;}

function tspBranchAndBound(startId,destIds,ap){
    const n=destIds.length;let minCost=Infinity,bestPath=null,nodesExplored=0,pruneCount=0;
    function lb(curr,unvis){
        let b=0,me=ap[curr].dist[startId];
        for(const u of unvis)me=Math.min(me,ap[curr].dist[u]);b+=me;
        for(const u of unvis){let m=ap[u].dist[startId];for(const v of unvis)if(v!==u)m=Math.min(m,ap[u].dist[v]);b+=m;}
        return b;
    }
    function search(curr,vis,cost,path){
        nodesExplored++;
        if(vis.size===n){const t=cost+ap[curr].dist[startId];if(t<minCost){minCost=t;bestPath=[...path,startId];}return;}
        const uv=destIds.filter(d=>!vis.has(d));
        if(cost+lb(curr,uv)>=minCost){pruneCount++;return;}
        for(const next of destIds){if(!vis.has(next)){vis.add(next);path.push(next);search(next,vis,cost+ap[curr].dist[next],path);vis.delete(next);path.pop();}}
    }
    search(startId,new Set(),0,[startId]);
    return{cost:minCost,path:bestPath,nodesExplored,pruneCount};
}

// =====================================================
// Main Control
// =====================================================
function handleCalculate(){
    if(nodes.length<2){alert('請至少建立 2 個城市！');return;}
    const startId=parseInt(startNodeSelect.value);if(isNaN(startId)){alert('請選擇起始城市！');return;}
    const dests=Array.from(document.querySelectorAll('.dest-checkbox input:checked')).map(c=>parseInt(c.value)).filter(id=>id!==startId);
    if(!dests.length){alert('請選擇至少一個不同於起點的目的地！');return;}
    const ap=computeAllPairs();
    for(const d of dests)if(ap[startId].dist[d]===Infinity){alert(`城市 ${startId} 無法到達城市 ${d}！`);return;}
    const result=tspBranchAndBound(startId,dests,ap);
    if(!result||result.cost===Infinity){alert('無法找到有效路徑！');return;}
    displayResult(result,ap,startId,dests);
}

function handleClearResult(){resultSection.style.display='none';algoInfo.style.display='none';currentRoute=null;if(animationReq)cancelAnimationFrame(animationReq);drawGraph();}

function displayResult(result,ap,startId,destIds){
    minTimeResult.textContent=result.cost+' 單位時間';
    nodesExploredResult.textContent=result.nodesExplored;
    pruneCountResult.textContent=result.pruneCount;
    routeDisplay.innerHTML='';
    result.path.forEach((id,i)=>{
        const s=document.createElement('span');s.className=id===startId?'route-node start-node':destIds.includes(id)?'route-node dest-node':'route-node';s.textContent=id;routeDisplay.appendChild(s);
        if(i<result.path.length-1){const a=document.createElement('span');a.className='route-arrow';a.innerHTML='→';routeDisplay.appendChild(a);}
    });
    segmentDetails.innerHTML='';const fullPath=[];
    for(let i=0;i<result.path.length-1;i++){
        const u=result.path[i],v=result.path[i+1],seg=getPath(u,v,ap),sc=ap[u].dist[v];
        const d=document.createElement('div');d.className='segment-item';
        d.innerHTML=`<strong>第 ${i+1} 段：</strong>城市 ${u} → 城市 ${v}｜路徑：${seg.join(' → ')}｜時間：<strong>${sc}</strong>`;
        segmentDetails.appendChild(d);
        if(i===0)fullPath.push(...seg);else{seg.shift();fullPath.push(...seg);}
    }
    currentRoute={logicalPath:result.path,physicalPath:fullPath};

    algoInfoTitle.textContent='分支定界法 (B&B) 執行資訊';algoInfoContent.innerHTML='';
    [`搜尋節點數：${result.nodesExplored}`,`修剪次數：${result.pruneCount}`,`最優解：${result.cost}`,`路線：${result.path.join(' → ')}`].forEach((t,i)=>{
        const d=document.createElement('div');d.className='step-item'+(i===2?' highlight':'');d.textContent=t;algoInfoContent.appendChild(d);
    });
    algoInfo.style.display='block';resultSection.style.display='block';
    animationProgress=0;if(animationReq)cancelAnimationFrame(animationReq);animateRoute();
}

// =====================================================
// Drawing (Light Theme)
// =====================================================
function drawGraph(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawGrid();
    ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);
    const startId=parseInt(startNodeSelect.value);
    const destIds=Array.from(document.querySelectorAll('.dest-checkbox input:checked')).map(c=>parseInt(c.value));

    // Edges
    edges.forEach(e=>{
        const s=nodes.find(n=>n.id===e.source),t=nodes.find(n=>n.id===e.target);if(!s||!t)return;
        ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(t.x,t.y);ctx.strokeStyle='#cbd5e1';ctx.lineWidth=2;ctx.stroke();
        const mx=(s.x+t.x)/2,my=(s.y+t.y)/2;
        ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(mx,my,15,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle='#475569';ctx.font='bold 12px Inter';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.weight,mx,my);
    });

    // Edge add highlight
    if(currentTool==='addEdge'&&edgeSourceNode){const sn=nodes.find(n=>n.id===edgeSourceNode.id);if(sn){ctx.beginPath();ctx.arc(sn.x,sn.y,30,0,Math.PI*2);ctx.strokeStyle='#059669';ctx.lineWidth=2.5;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);}}

    // Animated route
    if(currentRoute&&currentRoute.physicalPath.length>1){
        const p=currentRoute.physicalPath,ts=p.length-1,cf=animationProgress*ts,cs=Math.floor(cf),rm=cf-cs;
        ctx.shadowColor='rgba(5,150,105,0.3)';ctx.shadowBlur=8;ctx.lineWidth=4;ctx.strokeStyle='#059669';ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
        for(let i=0;i<=cs&&i<ts;i++){const p1=nodes.find(n=>n.id===p[i]),p2=nodes.find(n=>n.id===p[i+1]);if(!p1||!p2)break;if(i===0)ctx.moveTo(p1.x,p1.y);if(i===cs)ctx.lineTo(p1.x+(p2.x-p1.x)*rm,p1.y+(p2.y-p1.y)*rm);else ctx.lineTo(p2.x,p2.y);}
        ctx.stroke();ctx.shadowBlur=0;
        if(cs<ts){const p1=nodes.find(n=>n.id===p[cs]),p2=nodes.find(n=>n.id===p[cs+1]);if(p1&&p2){const vx=p1.x+(p2.x-p1.x)*rm,vy=p1.y+(p2.y-p1.y)*rm;ctx.beginPath();ctx.arc(vx,vy,14,0,Math.PI*2);ctx.fillStyle='rgba(5,150,105,0.15)';ctx.fill();ctx.beginPath();ctx.arc(vx,vy,8,0,Math.PI*2);ctx.fillStyle='#059669';ctx.fill();}}
    }

    // Nodes
    nodes.forEach(n=>{
        const isS=n.id===startId,isD=destIds.includes(n.id);
        if(isS||isD){ctx.beginPath();ctx.arc(n.x,n.y,28,0,Math.PI*2);ctx.fillStyle=isS?'rgba(79,70,229,0.08)':'rgba(234,88,12,0.08)';ctx.fill();}
        ctx.beginPath();ctx.arc(n.x,n.y,20,0,Math.PI*2);
        ctx.fillStyle=isS?'#4f46e5':isD?'#ea580c':'#64748b';ctx.fill();
        ctx.lineWidth=2;ctx.strokeStyle=isS?'#6366f1':isD?'#f97316':'#94a3b8';ctx.stroke();
        ctx.fillStyle='#fff';ctx.font='bold 14px Inter';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.id,n.x,n.y);
    });
    ctx.restore();
}

function drawGrid(){
    const gs=50*camera.zoom,ox=camera.x%gs,oy=camera.y%gs;
    ctx.strokeStyle='#f1f5f9';ctx.lineWidth=1;
    for(let x=ox;x<canvas.width;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
    for(let y=oy;y<canvas.height;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
}

function animateRoute(){animationProgress+=0.004;if(animationProgress>1){animationProgress=1;drawGraph();return;}drawGraph();animationReq=requestAnimationFrame(animateRoute);}

init();
