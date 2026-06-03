// =====================================================
// 學生宿舍最佳配對系統（精簡版 v2）
// 修正：學生數可自訂、B&B 加時間上限、效能優化
// 演算法：分支定界法 / 貪婪法 / 動態規劃
// =====================================================

let rooms = [];
let students = [];
let bedSlots = [];
let scoreMatrix = [];
let currentResult = null;

const SL = i => String.fromCharCode(65 + i);
const TYPES = { 2: '雙人房', 3: '三人房', 4: '四人房' };
const BNB_TIME_LIMIT = 2000; // B&B 最多跑 2 秒

const canvas = document.getElementById('matchCanvas');
const ctx = canvas.getContext('2d');
function $(id) { return document.getElementById(id); }

// ========== Init ==========
function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    $('btnGenerate').addEventListener('click', generate);
    $('btnExample1').addEventListener('click', loadExample1);
    $('btnExample2').addEventListener('click', loadExample2);
    $('btnRegenStudents').addEventListener('click', regenStudents);
    $('btnMatch').addEventListener('click', runMatch);
    $('btnCompare').addEventListener('click', runCompare);
    $('btnClear').addEventListener('click', clearResults);
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    drawBipartite();
}

// ========== Data Generation ==========
function generate() {
    const nd = Math.min(parseInt($('numDouble').value) || 0, 5);
    const nt = Math.min(parseInt($('numTriple').value) || 0, 5);
    const nq = Math.min(parseInt($('numQuad').value) || 0, 5);
    rooms = [];
    let id = 0, roomNum = 101;
    for (let i = 0; i < nd; i++) rooms.push({ id: id++, number: roomNum++, type: 2 });
    for (let i = 0; i < nt; i++) rooms.push({ id: id++, number: roomNum++, type: 3 });
    for (let i = 0; i < nq; i++) rooms.push({ id: id++, number: roomNum++, type: 4 });
    expandBeds();
    if (bedSlots.length === 0) { alert('請至少設定一間房間！'); return; }

    // 學生數 = 使用者輸入或總床位數（取較小者）
    let ns = parseInt($('numStudents').value) || bedSlots.length;
    if (ns > bedSlots.length) ns = bedSlots.length;
    $('numStudents').value = ns;
    generateStudents(ns);
    buildScoreMatrix();
    renderAll();
}

function regenStudents() {
    if (bedSlots.length === 0) { alert('請先生成房間！'); return; }
    let ns = parseInt($('numStudents').value) || bedSlots.length;
    if (ns > bedSlots.length) { ns = bedSlots.length; $('numStudents').value = ns; }
    if (ns < 1) { ns = 1; $('numStudents').value = 1; }
    generateStudents(ns);
    buildScoreMatrix();
    renderAll();
}

function generateStudents(count) {
    students = [];
    const typeOpts = ['2', '3', '4', 'any'];
    for (let i = 0; i < count; i++) {
        students.push({ id: i, name: SL(i), prefType: typeOpts[Math.floor(Math.random() * 4)] });
    }
}

function loadExample1() {
    rooms = [
        { id: 0, number: 101, type: 2 },
        { id: 1, number: 102, type: 2 }
    ];
    students = [
        { id: 0, name: 'A', prefType: '2' },
        { id: 1, name: 'B', prefType: '2' },
        { id: 2, name: 'C', prefType: 'any' },
        { id: 3, name: 'D', prefType: '2' }
    ];
    expandBeds();
    $('numStudents').value = students.length;
    buildScoreMatrix(); renderAll();
    $('canvasSubtitle').textContent = '範例 1：2 間雙人房 × 4 位學生';
}

function loadExample2() {
    rooms = [
        { id: 0, number: 201, type: 2 },
        { id: 1, number: 202, type: 3 }
    ];
    students = [
        { id: 0, name: 'A', prefType: '2' },
        { id: 1, name: 'B', prefType: '3' },
        { id: 2, name: 'C', prefType: '2' },
        { id: 3, name: 'D', prefType: 'any' },
        { id: 4, name: 'E', prefType: '3' }
    ];
    expandBeds();
    $('numStudents').value = students.length;
    buildScoreMatrix(); renderAll();
    $('canvasSubtitle').textContent = '範例 2：1 間雙人房 + 1 間三人房 × 5 位學生';
}

function expandBeds() {
    bedSlots = [];
    rooms.forEach((r, ri) => {
        for (let b = 0; b < r.type; b++) {
            bedSlots.push({ slotIdx: bedSlots.length, roomIdx: ri, roomNumber: r.number, bed: b + 1, type: r.type });
        }
    });
}

// ========== Score ==========
function calcScore(student, slot) {
    const seed = (student.id * 31 + slot.slotIdx * 17 + 7) % 30 + 20;
    let typeBonus = 0;
    if (student.prefType === 'any') typeBonus = 30;
    else if (parseInt(student.prefType) === slot.type) typeBonus = 50;
    else if (Math.abs(parseInt(student.prefType) - slot.type) === 1) typeBonus = 20;
    else typeBonus = 5;
    return Math.min(100, seed + typeBonus);
}

function buildScoreMatrix() {
    scoreMatrix = [];
    for (let i = 0; i < students.length; i++) {
        const row = [];
        for (let j = 0; j < bedSlots.length; j++) row.push(calcScore(students[i], bedSlots[j]));
        scoreMatrix.push(row);
    }
}

function readScoresFromUI() {
    $('matrixWrapper').querySelectorAll('input').forEach(inp => {
        const i = parseInt(inp.dataset.i), j = parseInt(inp.dataset.j);
        let v = parseInt(inp.value); if (isNaN(v) || v < 0) v = 0; if (v > 100) v = 100;
        scoreMatrix[i][j] = v;
    });
}

// ========== Render ==========
function renderAll() {
    renderRooms(); renderStudents(); renderMatrix(); updateStats();
    $('matrixPanel').style.display = 'block';
    $('canvasSubtitle').textContent = `${rooms.length} 間房（${bedSlots.length} 床位）× ${students.length} 位學生`;
    drawBipartite();
}

function renderRooms() {
    const list = $('roomList'); list.innerHTML = '';
    rooms.forEach(r => {
        const tc = r.type === 3 ? 't3' : r.type === 4 ? 't4' : '';
        const card = document.createElement('div'); card.className = 'room-card';
        card.innerHTML = `<span class="room-num">${r.number}</span><span class="room-type ${tc}">${TYPES[r.type]}</span><span class="room-attr">${r.type} 床位</span>`;
        list.appendChild(card);
    });
}

function renderStudents() {
    const list = $('studentList'); list.innerHTML = '';
    students.forEach((s, i) => {
        const card = document.createElement('div'); card.className = 'student-card';
        card.innerHTML = `
            <span class="student-name">${s.name}</span>
            <label>偏好房型</label>
            <select data-si="${i}">
                <option value="2" ${s.prefType==='2'?'selected':''}>雙人房</option>
                <option value="3" ${s.prefType==='3'?'selected':''}>三人房</option>
                <option value="4" ${s.prefType==='4'?'selected':''}>四人房</option>
                <option value="any" ${s.prefType==='any'?'selected':''}>不限</option>
            </select>`;
        card.querySelector('select').addEventListener('change', e => {
            students[parseInt(e.target.dataset.si)].prefType = e.target.value;
            buildScoreMatrix(); renderMatrix();
        });
        list.appendChild(card);
    });
}

function renderMatrix() {
    const n = students.length, m = bedSlots.length;
    let html = '<table class="score-matrix"><thead><tr><th></th>';
    bedSlots.forEach(b => html += `<th>${b.roomNumber}-${b.bed}</th>`);
    html += '</tr></thead><tbody>';
    for (let i = 0; i < n; i++) {
        html += `<tr><th class="row-header">${students[i].name}</th>`;
        for (let j = 0; j < m; j++)
            html += `<td id="cell-${i}-${j}"><input type="number" min="0" max="100" value="${scoreMatrix[i][j]}" data-i="${i}" data-j="${j}"></td>`;
        html += '</tr>';
    }
    html += '</tbody></table>';
    $('matrixWrapper').innerHTML = html;
    $('matrixWrapper').querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', e => {
            const i = parseInt(e.target.dataset.i), j = parseInt(e.target.dataset.j);
            let v = parseInt(e.target.value); if (isNaN(v)||v<0) v=0; if(v>100) v=100;
            scoreMatrix[i][j] = v; e.target.value = v;
        });
    });
}

function updateStats() {
    $('statRooms').textContent = rooms.length;
    $('statBeds').textContent = bedSlots.length;
    $('statStudents').textContent = students.length;
}

// ========== Algorithm 1: B&B (with time limit) ==========
function solveBnB() {
    readScoresFromUI();
    const n = students.length, m = bedSlots.length, sz = Math.min(n, m);
    let bestScore = -1, bestAssign = null, nodesExplored = 0, pruneCount = 0;
    let timedOut = false;
    const startTime = performance.now();

    // Pre-compute max score per student for faster upper bound
    const maxPerStudent = [];
    for (let p = 0; p < sz; p++) {
        let sorted = [];
        for (let j = 0; j < m; j++) sorted.push(scoreMatrix[p][j]);
        sorted.sort((a, b) => b - a);
        maxPerStudent.push(sorted);
    }

    function ub(person, used) {
        let u = 0;
        for (let p = person; p < sz; p++) {
            // Take the max available score for this person
            for (let k = 0; k < maxPerStudent[p].length; k++) {
                // Find the actual max among unused slots
                let mx = 0;
                for (let j = 0; j < m; j++) {
                    if (!used.has(j)) { mx = Math.max(mx, scoreMatrix[p][j]); }
                }
                u += mx;
                break;
            }
        }
        return u;
    }

    function search(p, sc, asgn, used) {
        // Time limit check every 500 nodes
        if (nodesExplored % 500 === 0 && performance.now() - startTime > BNB_TIME_LIMIT) {
            timedOut = true; return;
        }
        nodesExplored++;
        if (p === sz) {
            if (sc > bestScore) { bestScore = sc; bestAssign = [...asgn]; }
            return;
        }
        if (sc + ub(p, used) <= bestScore) { pruneCount++; return; }

        // Sort jobs by score descending for this person (better pruning)
        const order = [];
        for (let j = 0; j < m; j++) { if (!used.has(j)) order.push(j); }
        order.sort((a, b) => scoreMatrix[p][b] - scoreMatrix[p][a]);

        for (const j of order) {
            if (timedOut) return;
            asgn[p] = j; used.add(j);
            search(p + 1, sc + scoreMatrix[p][j], asgn, used);
            used.delete(j);
        }
    }

    // Use greedy as initial lower bound for better pruning
    const greedyResult = solveGreedyInternal();
    bestScore = greedyResult.score;
    bestAssign = greedyResult.assignment;

    search(0, 0, new Array(sz), new Set());
    const elapsed = performance.now() - startTime;

    return {
        algo: timedOut ? '分支定界法 (B&B) ⏱️ 逾時' : '分支定界法 (B&B)',
        score: bestScore,
        assignment: bestAssign,
        nodesExplored,
        pruneCount,
        time: elapsed,
        timedOut
    };
}

// ========== Algorithm 2: Greedy ==========
function solveGreedyInternal() {
    const n = students.length, m = bedSlots.length, sz = Math.min(n, m);
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) pairs.push({ i, j, score: scoreMatrix[i][j] });
    pairs.sort((a, b) => b.score - a.score);
    const usedI = new Set(), usedJ = new Set(), asgn = new Array(sz).fill(-1);
    let total = 0, steps = 0;
    for (const p of pairs) {
        steps++;
        if (usedI.has(p.i) || usedJ.has(p.j)) continue;
        asgn[p.i] = p.j; usedI.add(p.i); usedJ.add(p.j); total += p.score;
        if (usedI.size === sz) break;
    }
    return { score: total, assignment: asgn, nodesExplored: steps };
}

function solveGreedy() {
    readScoresFromUI();
    const t0 = performance.now();
    const r = solveGreedyInternal();
    return { algo: '貪婪演算法', score: r.score, assignment: r.assignment, nodesExplored: r.nodesExplored, pruneCount: 0, time: performance.now() - t0 };
}

// ========== Algorithm 3: DP ==========
function solveDP() {
    readScoresFromUI();
    const n = students.length, m = bedSlots.length, sz = Math.min(n, m);
    if (m > 20) { alert('DP 最多支援 20 個床位！'); return null; }
    const full = (1 << m) - 1;
    const dp = new Float64Array(full + 1).fill(-1);
    const par = new Int32Array(full + 1).fill(-1);
    dp[0] = 0;
    let ne = 0;
    const t0 = performance.now();
    for (let mask = 0; mask <= full; mask++) {
        if (dp[mask] < 0) continue;
        const person = popcount(mask);
        if (person >= sz) continue;
        for (let j = 0; j < m; j++) {
            if (mask & (1 << j)) continue;
            ne++;
            const nm = mask | (1 << j), ns = dp[mask] + scoreMatrix[person][j];
            if (ns > dp[nm]) { dp[nm] = ns; par[nm] = mask; }
        }
    }
    let bm = 0, bs = -1;
    for (let mask = 0; mask <= full; mask++) if (popcount(mask) === sz && dp[mask] > bs) { bs = dp[mask]; bm = mask; }
    const asgn = new Array(sz).fill(-1);
    let cur = bm;
    for (let p = sz - 1; p >= 0; p--) { const prev = par[cur]; asgn[p] = Math.log2(cur ^ prev); cur = prev; }
    return { algo: '動態規劃 (DP)', score: bs, assignment: asgn, nodesExplored: ne, pruneCount: 0, time: performance.now() - t0 };
}

function popcount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

// ========== Blocking Pairs ==========
function findBlockingPairs(asgn) {
    const bp = [], sz = asgn.length;
    for (let i = 0; i < sz; i++) {
        if (asgn[i] < 0) continue;
        for (let j = 0; j < bedSlots.length; j++) {
            if (asgn[i] === j) continue;
            if (scoreMatrix[i][j] > scoreMatrix[i][asgn[i]]) {
                const h = asgn.findIndex(x => x === j);
                if (h >= 0 && scoreMatrix[i][j] > scoreMatrix[h][j]) {
                    bp.push({ reason: `學生 ${students[i].name} 對 ${bedSlots[j].roomNumber} 號房偏好(${scoreMatrix[i][j]}) > 目前住戶 ${students[h].name}(${scoreMatrix[h][j]})` });
                }
            }
        }
    }
    return bp;
}

// ========== UI Controls ==========
function runMatch() {
    if (!scoreMatrix.length) { alert('請先生成資料！'); return; }
    const a = document.querySelector('input[name="algo"]:checked').value;
    let r;
    if (a === 'bnb') r = solveBnB();
    else if (a === 'greedy') r = solveGreedy();
    else r = solveDP();
    if (!r) return;
    currentResult = r; displayResult(r); drawBipartite(r.assignment);
}

function runCompare() {
    if (!scoreMatrix.length) { alert('請先生成資料！'); return; }
    const r1 = solveBnB(), r2 = solveGreedy(), r3 = solveDP();
    displayCompare(r1, r2, r3);
    currentResult = r1; drawBipartite(r1.assignment);
}

function clearResults() {
    $('resultSection').style.display = 'none';
    $('compareSection').style.display = 'none';
    $('algoInfo').style.display = 'none';
    currentResult = null;
    document.querySelectorAll('.highlight-cell').forEach(c => c.classList.remove('highlight-cell'));
    drawBipartite();
}

function displayResult(r) {
    $('resAlgo').textContent = r.algo;
    $('resTotalScore').textContent = r.score + ' 分';
    $('resNodes').textContent = r.nodesExplored;
    $('resPrune').textContent = r.pruneCount;
    $('resTime').textContent = r.time.toFixed(2) + ' ms';

    const det = $('matchDetails'); det.innerHTML = '';
    const rm = {};
    r.assignment.forEach((j, i) => {
        if (j < 0) return;
        const s = bedSlots[j];
        if (!rm[s.roomNumber]) rm[s.roomNumber] = { type: s.type, members: [] };
        rm[s.roomNumber].members.push({ name: students[i].name, score: scoreMatrix[i][j] });
    });
    Object.entries(rm).forEach(([num, info]) => {
        const d = document.createElement('div'); d.className = 'match-item';
        d.innerHTML = `<strong>房間 ${num}</strong>（${TYPES[info.type]}）← ${info.members.map(m => `${m.name}(${m.score}分)`).join(', ')}`;
        det.appendChild(d);
    });

    if (r.timedOut) {
        const warn = document.createElement('div'); warn.className = 'blocking-item';
        warn.textContent = '⚠️ B&B 計算逾時（2秒），此為目前找到的最佳解，不保證是全域最優';
        det.appendChild(warn);
    }

    const bp = findBlockingPairs(r.assignment);
    const sEl = $('resStability'), bpEl = $('blockingPairs'); bpEl.innerHTML = '';
    if (!bp.length) { sEl.textContent = '✅ 穩定（無 blocking pair）'; sEl.style.color = '#059669'; }
    else {
        sEl.textContent = `⚠️ ${bp.length} 個 blocking pair`; sEl.style.color = '#dc2626';
        bp.slice(0, 4).forEach(b => { const d = document.createElement('div'); d.className = 'blocking-item'; d.textContent = b.reason; bpEl.appendChild(d); });
    }

    document.querySelectorAll('.highlight-cell').forEach(c => c.classList.remove('highlight-cell'));
    r.assignment.forEach((j, i) => { if (j >= 0) { const c = document.getElementById(`cell-${i}-${j}`); if (c) c.classList.add('highlight-cell'); } });

    $('algoInfoTitle').textContent = r.algo;
    const ic = $('algoInfoContent'); ic.innerHTML = '';
    [`節點：${r.nodesExplored}`, `修剪：${r.pruneCount}`, `最優：${r.score}`, `時間：${r.time.toFixed(2)}ms`].forEach((t, i) => {
        const d = document.createElement('div'); d.className = 'step-item' + (i === 2 ? ' highlight' : ''); d.textContent = t; ic.appendChild(d);
    });
    $('algoInfo').style.display = 'block'; $('resultSection').style.display = 'block'; $('compareSection').style.display = 'none';
}

function displayCompare(r1, r2, r3) {
    const body = $('compareBody'), best = Math.max(r1.score, r2.score, r3.score);
    body.innerHTML = '';
    const label1 = r1.timedOut ? r1.score + ' ⏱️' : r1.score;
    [['總偏好分數', label1, r2.score, r3.score],
     ['搜尋節點', r1.nodesExplored, r2.nodesExplored, r3.nodesExplored],
     ['修剪次數', r1.pruneCount, r2.pruneCount, r3.pruneCount],
     ['時間(ms)', r1.time.toFixed(2), r2.time.toFixed(2), r3.time.toFixed(2)],
     ['最優?', r1.score === best ? (r1.timedOut ? '⏱️' : '✅') : '❌', r2.score === best ? '✅' : '❌', r3.score === best ? '✅' : '❌']
    ].forEach(row => {
        const tr = document.createElement('tr');
        if (row[0] === '總偏好分數') tr.className = 'best-row';
        row.forEach(c => { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
        body.appendChild(tr);
    });
    const b1 = findBlockingPairs(r1.assignment).length, b2 = findBlockingPairs(r2.assignment).length, b3 = findBlockingPairs(r3.assignment).length;
    const bpr = document.createElement('tr');
    ['Blocking pairs', b1, b2, b3].forEach(c => { const td = document.createElement('td'); td.textContent = c; bpr.appendChild(td); });
    body.appendChild(bpr);
    $('resultSection').style.display = 'none'; $('compareSection').style.display = 'block'; $('algoInfo').style.display = 'none';
}

// ========== Canvas ==========
function drawBipartite(assignment) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    if (!students.length || !rooms.length) return;

    const cw = canvas.width, ch = canvas.height;
    const matH = $('matrixPanel').style.display !== 'none' ? $('matrixPanel').offsetHeight : 0;
    const drawH = ch - matH - 60, topY = 50;
    const leftX = cw * 0.2, rightX = cw * 0.7;
    const sSpacing = Math.min(50, (drawH - 30) / students.length);
    const rSpacing = Math.min(70, (drawH - 30) / rooms.length);
    const sStartY = topY + (drawH - (students.length - 1) * sSpacing) / 2;
    const rStartY = topY + (drawH - (rooms.length - 1) * rSpacing) / 2;
    const sPos = students.map((_, i) => ({ x: leftX, y: sStartY + i * sSpacing }));
    const rPos = rooms.map((_, j) => ({ x: rightX, y: rStartY + j * rSpacing }));

    ctx.font = 'bold 13px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#4f46e5'; ctx.fillText('學生', leftX, topY - 10);
    ctx.fillStyle = '#ea580c'; ctx.fillText('房間', rightX, topY - 10);

    if (assignment) {
        assignment.forEach((slotJ, i) => {
            if (slotJ < 0 || i >= sPos.length) return;
            const ri = bedSlots[slotJ].roomIdx;
            if (ri >= rPos.length) return;
            const sp = sPos[i], rp = rPos[ri];
            ctx.beginPath(); ctx.moveTo(sp.x + 16, sp.y); ctx.lineTo(rp.x - 30, rp.y);
            ctx.strokeStyle = '#059669'; ctx.lineWidth = 2; ctx.stroke();
            const mx = (sp.x + rp.x) / 2, my = (sp.y + rp.y) / 2;
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#059669'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(scoreMatrix[i][slotJ], mx, my);
        });
    }

    sPos.forEach((pos, i) => {
        const matched = assignment && assignment[i] >= 0;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = matched ? '#4f46e5' : '#94a3b8'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = matched ? '#6366f1' : '#cbd5e1'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(students[i].name, pos.x, pos.y);
    });

    rPos.forEach((pos, j) => {
        const r = rooms[j], w = 58, h = 32;
        const matched = assignment && assignment.some(s => s >= 0 && bedSlots[s].roomIdx === j);
        ctx.beginPath(); roundRect(ctx, pos.x - w / 2, pos.y - h / 2, w, h, 6);
        ctx.fillStyle = matched ? '#ea580c' : '#94a3b8'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = matched ? '#f97316' : '#cbd5e1'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(r.number, pos.x, pos.y - 5);
        ctx.font = '9px Inter'; ctx.fillText(TYPES[r.type], pos.x, pos.y + 8);
    });
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function drawGrid() {
    ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
}

init();
