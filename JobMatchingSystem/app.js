// =====================================================
// 學生宿舍最佳配對系統（完整版）
// 支援雙人房/三人房/四人房，自動計算偏好分數
// 演算法：分支定界法 / 貪婪法 / 動態規劃
// =====================================================

// ========== Data Model ==========
let rooms = [];       // [{id, number, type(2/3/4), floor, ac, bath, orient}]
let students = [];    // [{id, name, prefType, prefFloor, prefAC, prefBath, prefOrient}]
let bedSlots = [];    // expanded: [{slotIdx, roomIdx, roomNumber, ...roomAttrs}]
let scoreMatrix = []; // students × bedSlots
let currentResult = null;

const SL = i => String.fromCharCode(65 + i);
const TYPES = { 2: '雙人房', 3: '三人房', 4: '四人房' };
const ORIENT = ['南向', '北向'];

// DOM refs
const canvas = document.getElementById('matchCanvas');
const ctx = canvas.getContext('2d');

function $(id) { return document.getElementById(id); }

// ========== Init ==========
function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    $('btnGenRooms').addEventListener('click', generateRooms);
    $('btnExample1').addEventListener('click', loadExample1);
    $('btnExample2').addEventListener('click', loadExample2);
    $('btnGenStudents').addEventListener('click', generateStudents);
    $('btnCalcScore').addEventListener('click', calcScores);
    $('btnMatch').addEventListener('click', runMatch);
    $('btnCompare').addEventListener('click', runCompare);
    $('btnClear').addEventListener('click', clearResults);
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    drawBipartite();
}

// ========== Room Management ==========
function generateRooms() {
    const nd = parseInt($('numDouble').value) || 0;
    const nt = parseInt($('numTriple').value) || 0;
    const nq = parseInt($('numQuad').value) || 0;
    const sf = parseInt($('startFloor').value) || 2;
    const sr = parseInt($('startRoom').value) || 1;
    rooms = [];
    let roomIdx = 0;
    const allTypes = [];
    for (let i = 0; i < nd; i++) allTypes.push(2);
    for (let i = 0; i < nt; i++) allTypes.push(3);
    for (let i = 0; i < nq; i++) allTypes.push(4);
    allTypes.forEach((type, i) => {
        const floor = sf + Math.floor(i / 3);
        const num = floor * 100 + sr + (i % 3);
        rooms.push({
            id: roomIdx++, number: num, type, floor,
            ac: Math.random() > 0.4, bath: Math.random() > 0.5,
            orient: ORIENT[Math.floor(Math.random() * 2)]
        });
    });
    renderRooms();
    updateStats();
    autoSetStudentCount();
}

function loadExample1() {
    rooms = [
        { id: 0, number: 201, type: 2, floor: 2, ac: true, bath: true, orient: '南向' },
        { id: 1, number: 202, type: 2, floor: 2, ac: true, bath: false, orient: '北向' },
        { id: 2, number: 301, type: 3, floor: 3, ac: false, bath: true, orient: '南向' },
        { id: 3, number: 401, type: 4, floor: 4, ac: true, bath: true, orient: '北向' }
    ];
    students = [
        { id:0, name:'A', prefType:'2', prefFloor:'low', prefAC:'yes', prefBath:'any', prefOrient:'南向' },
        { id:1, name:'B', prefType:'2', prefFloor:'low', prefAC:'any', prefBath:'yes', prefOrient:'any' },
        { id:2, name:'C', prefType:'3', prefFloor:'mid', prefAC:'any', prefBath:'any', prefOrient:'南向' },
        { id:3, name:'D', prefType:'4', prefFloor:'any', prefAC:'yes', prefBath:'yes', prefOrient:'any' },
        { id:4, name:'E', prefType:'2', prefFloor:'low', prefAC:'yes', prefBath:'any', prefOrient:'北向' },
        { id:5, name:'F', prefType:'3', prefFloor:'mid', prefAC:'any', prefBath:'yes', prefOrient:'any' },
        { id:6, name:'G', prefType:'4', prefFloor:'high', prefAC:'yes', prefBath:'any', prefOrient:'any' },
        { id:7, name:'H', prefType:'any', prefFloor:'any', prefAC:'any', prefBath:'any', prefOrient:'南向' },
        { id:8, name:'I', prefType:'2', prefFloor:'low', prefAC:'any', prefBath:'yes', prefOrient:'南向' },
        { id:9, name:'J', prefType:'3', prefFloor:'any', prefAC:'yes', prefBath:'any', prefOrient:'北向' },
        { id:10, name:'K', prefType:'4', prefFloor:'high', prefAC:'any', prefBath:'true', prefOrient:'any' },
    ];
    // auto-trim students to total beds
    expandBedSlots();
    if (students.length > bedSlots.length) students = students.slice(0, bedSlots.length);
    renderRooms(); renderStudents(); updateStats();
    $('canvasSubtitle').textContent = `範例 1：${rooms.length} 間房（${bedSlots.length} 床位）× ${students.length} 位學生`;
    drawBipartite();
}

function loadExample2() {
    rooms = [
        { id: 0, number: 501, type: 2, floor: 5, ac: true, bath: true, orient: '南向' },
        { id: 1, number: 502, type: 2, floor: 5, ac: false, bath: true, orient: '北向' },
        { id: 2, number: 503, type: 3, floor: 5, ac: true, bath: false, orient: '南向' },
    ];
    students = [
        { id:0, name:'A', prefType:'2', prefFloor:'high', prefAC:'yes', prefBath:'yes', prefOrient:'南向' },
        { id:1, name:'B', prefType:'2', prefFloor:'high', prefAC:'any', prefBath:'yes', prefOrient:'any' },
        { id:2, name:'C', prefType:'3', prefFloor:'any', prefAC:'yes', prefBath:'any', prefOrient:'南向' },
        { id:3, name:'D', prefType:'any', prefFloor:'high', prefAC:'any', prefBath:'any', prefOrient:'北向' },
        { id:4, name:'E', prefType:'3', prefFloor:'high', prefAC:'yes', prefBath:'any', prefOrient:'any' },
        { id:5, name:'F', prefType:'2', prefFloor:'any', prefAC:'any', prefBath:'yes', prefOrient:'南向' },
        { id:6, name:'G', prefType:'any', prefFloor:'high', prefAC:'any', prefBath:'any', prefOrient:'any' },
    ];
    expandBedSlots();
    if (students.length > bedSlots.length) students = students.slice(0, bedSlots.length);
    renderRooms(); renderStudents(); updateStats();
    $('canvasSubtitle').textContent = `範例 2：${rooms.length} 間房（${bedSlots.length} 床位）× ${students.length} 位學生`;
    drawBipartite();
}

function renderRooms() {
    const list = $('roomList');
    list.innerHTML = '';
    rooms.forEach((r, i) => {
        const tc = r.type === 3 ? 't3' : r.type === 4 ? 't4' : '';
        const card = document.createElement('div');
        card.className = 'room-card';
        card.innerHTML = `
            <span class="room-num">${r.number}</span>
            <span class="room-type ${tc}">${TYPES[r.type]}</span>
            <span class="room-attr">${r.floor}F</span>
            <span class="room-attr">${r.ac ? 'AC✓' : 'AC✗'}</span>
            <span class="room-attr">${r.bath ? '衛浴✓' : '衛浴✗'}</span>
            <span class="room-attr">${r.orient}</span>
            <span class="room-edit">
                <select data-ri="${i}" data-field="ac"><option value="true" ${r.ac?'selected':''}>AC✓</option><option value="false" ${!r.ac?'selected':''}>AC✗</option></select>
                <select data-ri="${i}" data-field="bath"><option value="true" ${r.bath?'selected':''}>衛浴✓</option><option value="false" ${!r.bath?'selected':''}>衛浴✗</option></select>
                <select data-ri="${i}" data-field="orient"><option ${r.orient==='南向'?'selected':''}>南向</option><option ${r.orient==='北向'?'selected':''}>北向</option></select>
            </span>`;
        card.querySelectorAll('select').forEach(sel => {
            sel.addEventListener('change', e => {
                const ri = parseInt(e.target.dataset.ri);
                const field = e.target.dataset.field;
                if (field === 'orient') rooms[ri].orient = e.target.value;
                else rooms[ri][field] = e.target.value === 'true';
                renderRooms();
            });
        });
        list.appendChild(card);
    });
    expandBedSlots();
}

function expandBedSlots() {
    bedSlots = [];
    rooms.forEach((r, ri) => {
        for (let b = 0; b < r.type; b++) {
            bedSlots.push({ slotIdx: bedSlots.length, roomIdx: ri, roomNumber: r.number, bed: b + 1, ...r });
        }
    });
}

function autoSetStudentCount() {
    expandBedSlots();
    $('numStudents').value = bedSlots.length;
    generateStudents();
}

function updateStats() {
    expandBedSlots();
    $('statRooms').textContent = rooms.length;
    $('statBeds').textContent = bedSlots.length;
    $('statStudents').textContent = students.length;
}

// ========== Student Management ==========
function generateStudents() {
    const ns = parseInt($('numStudents').value) || 1;
    students = [];
    const typeOptions = ['2', '3', '4', 'any'];
    const floorOptions = ['low', 'mid', 'high', 'any'];
    const boolOptions = ['yes', 'any'];
    const orientOptions = ['南向', '北向', 'any'];
    for (let i = 0; i < ns; i++) {
        students.push({
            id: i, name: SL(i),
            prefType: typeOptions[Math.floor(Math.random() * 4)],
            prefFloor: floorOptions[Math.floor(Math.random() * 4)],
            prefAC: boolOptions[Math.floor(Math.random() * 2)],
            prefBath: boolOptions[Math.floor(Math.random() * 2)],
            prefOrient: orientOptions[Math.floor(Math.random() * 3)]
        });
    }
    renderStudents();
    updateStats();
    drawBipartite();
}

function renderStudents() {
    const list = $('studentList');
    list.innerHTML = '';
    students.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
            <span class="student-name">${s.name}</span>
            <label>房型</label><select data-si="${i}" data-f="prefType">
                <option value="2" ${s.prefType==='2'?'selected':''}>雙人</option>
                <option value="3" ${s.prefType==='3'?'selected':''}>三人</option>
                <option value="4" ${s.prefType==='4'?'selected':''}>四人</option>
                <option value="any" ${s.prefType==='any'?'selected':''}>不限</option>
            </select>
            <label>樓層</label><select data-si="${i}" data-f="prefFloor">
                <option value="low" ${s.prefFloor==='low'?'selected':''}>低(1-2)</option>
                <option value="mid" ${s.prefFloor==='mid'?'selected':''}>中(3-4)</option>
                <option value="high" ${s.prefFloor==='high'?'selected':''}>高(5+)</option>
                <option value="any" ${s.prefFloor==='any'?'selected':''}>不限</option>
            </select>
            <label>AC</label><select data-si="${i}" data-f="prefAC">
                <option value="yes" ${s.prefAC==='yes'?'selected':''}>要</option>
                <option value="any" ${s.prefAC==='any'?'selected':''}>不限</option>
            </select>
            <label>衛浴</label><select data-si="${i}" data-f="prefBath">
                <option value="yes" ${s.prefBath==='yes'?'selected':''}>要</option>
                <option value="any" ${s.prefBath==='any'?'selected':''}>不限</option>
            </select>
            <label>朝向</label><select data-si="${i}" data-f="prefOrient">
                <option value="南向" ${s.prefOrient==='南向'?'selected':''}>南</option>
                <option value="北向" ${s.prefOrient==='北向'?'selected':''}>北</option>
                <option value="any" ${s.prefOrient==='any'?'selected':''}>不限</option>
            </select>`;
        card.querySelectorAll('select').forEach(sel => {
            sel.addEventListener('change', e => {
                students[parseInt(e.target.dataset.si)][e.target.dataset.f] = e.target.value;
            });
        });
        list.appendChild(card);
    });
}

// ========== Score Calculation ==========
function calcScore(student, slot) {
    let score = 0;
    // Room type (35 pts)
    if (student.prefType === 'any') score += 25;
    else if (parseInt(student.prefType) === slot.type) score += 35;
    else if (Math.abs(parseInt(student.prefType) - slot.type) === 1) score += 15;
    else score += 5;
    // Floor (25 pts)
    const f = slot.floor;
    if (student.prefFloor === 'any') score += 18;
    else if (student.prefFloor === 'low' && f <= 2) score += 25;
    else if (student.prefFloor === 'mid' && f >= 3 && f <= 4) score += 25;
    else if (student.prefFloor === 'high' && f >= 5) score += 25;
    else if (student.prefFloor === 'low' && f <= 4) score += 15;
    else if (student.prefFloor === 'mid' && (f === 2 || f === 5)) score += 15;
    else if (student.prefFloor === 'high' && f >= 3) score += 15;
    else score += 5;
    // AC (15 pts)
    if (student.prefAC === 'any') score += 10;
    else if (student.prefAC === 'yes' && slot.ac) score += 15;
    else score += 0;
    // Bathroom (15 pts)
    if (student.prefBath === 'any') score += 10;
    else if (student.prefBath === 'yes' && slot.bath) score += 15;
    else score += 0;
    // Orientation (10 pts)
    if (student.prefOrient === 'any') score += 7;
    else if (student.prefOrient === slot.orient) score += 10;
    else score += 3;
    return score;
}

function calcScores() {
    if (rooms.length === 0 || students.length === 0) { alert('請先設定房間和學生！'); return; }
    readStudentsFromUI();
    expandBedSlots();
    const n = students.length, m = bedSlots.length;
    scoreMatrix = [];
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < m; j++) row.push(calcScore(students[i], bedSlots[j]));
        scoreMatrix.push(row);
    }
    renderMatrix();
    $('matrixPanel').style.display = 'block';
    $('canvasSubtitle').textContent = `偏好分數已計算：${n} 位學生 × ${m} 個床位`;
    drawBipartite();
}

function readStudentsFromUI() {
    $('studentList').querySelectorAll('select').forEach(sel => {
        students[parseInt(sel.dataset.si)][sel.dataset.f] = sel.value;
    });
}

function renderMatrix() {
    const n = students.length, m = bedSlots.length;
    // Group bed slots by room for headers
    let html = '<table class="score-matrix"><thead><tr><th></th>';
    bedSlots.forEach(b => html += `<th>${b.roomNumber}-${b.bed}</th>`);
    html += '</tr></thead><tbody>';
    for (let i = 0; i < n; i++) {
        html += `<tr><th class="row-header">學生 ${students[i].name}</th>`;
        for (let j = 0; j < m; j++) {
            html += `<td id="cell-${i}-${j}">${scoreMatrix[i][j]}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    $('matrixWrapper').innerHTML = html;
}

// ========== Algorithm 1: Branch-and-Bound ==========
function solveBnB() {
    const n = students.length, m = bedSlots.length;
    const sz = Math.min(n, m);
    let bestScore = -1, bestAssign = null, nodesExplored = 0, pruneCount = 0;

    function upperBound(person, usedSlots) {
        let ub = 0;
        for (let p = person; p < sz; p++) {
            let mx = 0;
            for (let j = 0; j < m; j++) if (!usedSlots.has(j)) mx = Math.max(mx, scoreMatrix[p][j]);
            ub += mx;
        }
        return ub;
    }
    function search(person, curScore, assignment, usedSlots) {
        nodesExplored++;
        if (person === sz) { if (curScore > bestScore) { bestScore = curScore; bestAssign = [...assignment]; } return; }
        if (curScore + upperBound(person, usedSlots) <= bestScore) { pruneCount++; return; }
        for (let j = 0; j < m; j++) {
            if (!usedSlots.has(j)) {
                assignment[person] = j; usedSlots.add(j);
                search(person + 1, curScore + scoreMatrix[person][j], assignment, usedSlots);
                usedSlots.delete(j);
            }
        }
    }
    const t0 = performance.now();
    search(0, 0, new Array(sz), new Set());
    return { algo: '分支定界法 (B&B)', score: bestScore, assignment: bestAssign, nodesExplored, pruneCount, time: performance.now() - t0 };
}

// ========== Algorithm 2: Greedy ==========
function solveGreedy() {
    const n = students.length, m = bedSlots.length, sz = Math.min(n, m);
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) pairs.push({ i, j, score: scoreMatrix[i][j] });
    pairs.sort((a, b) => b.score - a.score);
    const usedI = new Set(), usedJ = new Set(), assignment = new Array(sz).fill(-1);
    let total = 0, steps = 0;
    const t0 = performance.now();
    for (const p of pairs) { steps++; if (usedI.has(p.i) || usedJ.has(p.j)) continue; assignment[p.i] = p.j; usedI.add(p.i); usedJ.add(p.j); total += p.score; if (usedI.size === sz) break; }
    return { algo: '貪婪演算法', score: total, assignment, nodesExplored: steps, pruneCount: 0, time: performance.now() - t0 };
}

// ========== Algorithm 3: DP (Bitmask) ==========
function solveDP() {
    const n = students.length, m = bedSlots.length, sz = Math.min(n, m);
    if (m > 20) { alert('DP 最多支援 20 個床位！'); return null; }
    const full = (1 << m) - 1;
    const dp = new Array(full + 1).fill(-1), parent = new Array(full + 1).fill(-1);
    dp[0] = 0; let nodesExplored = 0;
    const t0 = performance.now();
    for (let mask = 0; mask <= full; mask++) {
        if (dp[mask] < 0) continue;
        const person = popcount(mask);
        if (person >= sz) continue;
        for (let j = 0; j < m; j++) {
            if (mask & (1 << j)) continue;
            nodesExplored++;
            const nm = mask | (1 << j), ns = dp[mask] + scoreMatrix[person][j];
            if (ns > dp[nm]) { dp[nm] = ns; parent[nm] = mask; }
        }
    }
    let bestMask = 0, bestScore = -1;
    for (let mask = 0; mask <= full; mask++) if (popcount(mask) === sz && dp[mask] > bestScore) { bestScore = dp[mask]; bestMask = mask; }
    const assignment = new Array(sz).fill(-1);
    let cur = bestMask;
    for (let p = sz - 1; p >= 0; p--) { const prev = parent[cur]; assignment[p] = Math.log2(cur ^ prev); cur = prev; }
    return { algo: '動態規劃 (DP)', score: bestScore, assignment, nodesExplored, pruneCount: 0, time: performance.now() - t0 };
}
function popcount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

// ========== Blocking Pairs ==========
function findBlockingPairs(assignment) {
    const blocking = [], sz = assignment.length;
    for (let i = 0; i < sz; i++) {
        if (assignment[i] < 0) continue;
        for (let j = 0; j < bedSlots.length; j++) {
            if (assignment[i] === j) continue;
            if (scoreMatrix[i][j] > scoreMatrix[i][assignment[i]]) {
                const holder = assignment.findIndex(x => x === j);
                if (holder >= 0 && scoreMatrix[i][j] > scoreMatrix[holder][j]) {
                    blocking.push({ i, j, reason: `學生 ${students[i].name} 對 ${bedSlots[j].roomNumber} 號房偏好(${scoreMatrix[i][j]}) > 目前住戶 ${students[holder].name}(${scoreMatrix[holder][j]})` });
                }
            }
        }
    }
    return blocking;
}

// ========== UI Controls ==========
function runMatch() {
    if (scoreMatrix.length === 0) { calcScores(); if (scoreMatrix.length === 0) return; }
    const algo = document.querySelector('input[name="algo"]:checked').value;
    let r; if (algo === 'bnb') r = solveBnB(); else if (algo === 'greedy') r = solveGreedy(); else r = solveDP();
    if (!r) return; currentResult = r; displayResult(r); drawBipartite(r.assignment);
}
function runCompare() {
    if (scoreMatrix.length === 0) { calcScores(); if (scoreMatrix.length === 0) return; }
    const r1 = solveBnB(), r2 = solveGreedy(), r3 = solveDP();
    displayCompare(r1, r2, r3); currentResult = r1; drawBipartite(r1.assignment);
}
function clearResults() {
    $('resultSection').style.display = 'none'; $('compareSection').style.display = 'none';
    $('algoInfo').style.display = 'none'; currentResult = null;
    document.querySelectorAll('.highlight-cell').forEach(c => c.classList.remove('highlight-cell'));
    drawBipartite();
}

function displayResult(r) {
    $('resAlgo').textContent = r.algo;
    $('resTotalScore').textContent = r.score + ' 分';
    $('resNodes').textContent = r.nodesExplored;
    $('resPrune').textContent = r.pruneCount;
    $('resTime').textContent = r.time.toFixed(2) + ' ms';
    const details = $('matchDetails'); details.innerHTML = '';
    // Group by room
    const roomMap = {};
    r.assignment.forEach((j, i) => {
        if (j < 0) return;
        const slot = bedSlots[j];
        if (!roomMap[slot.roomNumber]) roomMap[slot.roomNumber] = [];
        roomMap[slot.roomNumber].push({ student: students[i].name, score: scoreMatrix[i][j], room: slot });
    });
    Object.entries(roomMap).forEach(([num, members]) => {
        const d = document.createElement('div'); d.className = 'match-item';
        const names = members.map(m => `${m.student}(${m.score}分)`).join(', ');
        const room = members[0].room;
        d.innerHTML = `<strong>房間 ${num}</strong>（${TYPES[room.type]}·${room.floor}F）← ${names}`;
        details.appendChild(d);
    });
    // Stability
    const blocking = findBlockingPairs(r.assignment);
    const sEl = $('resStability'), bpEl = $('blockingPairs'); bpEl.innerHTML = '';
    if (blocking.length === 0) { sEl.textContent = '✅ 穩定（無 blocking pair）'; sEl.style.color = '#059669'; }
    else { sEl.textContent = `⚠️ ${blocking.length} 個 blocking pair`; sEl.style.color = '#dc2626';
        blocking.slice(0, 5).forEach(bp => { const d = document.createElement('div'); d.className = 'blocking-item'; d.textContent = bp.reason; bpEl.appendChild(d); }); }
    // Highlight matrix
    document.querySelectorAll('.highlight-cell').forEach(c => c.classList.remove('highlight-cell'));
    r.assignment.forEach((j, i) => { if (j >= 0) { const c = document.getElementById(`cell-${i}-${j}`); if (c) c.classList.add('highlight-cell'); } });
    // Info panel
    $('algoInfoTitle').textContent = r.algo; const ic = $('algoInfoContent'); ic.innerHTML = '';
    [`搜尋節點：${r.nodesExplored}`, `修剪：${r.pruneCount}`, `最優分數：${r.score}`, `時間：${r.time.toFixed(2)} ms`].forEach((t, i) => {
        const d = document.createElement('div'); d.className = 'step-item' + (i === 2 ? ' highlight' : ''); d.textContent = t; ic.appendChild(d); });
    $('algoInfo').style.display = 'block'; $('resultSection').style.display = 'block'; $('compareSection').style.display = 'none';
}

function displayCompare(r1, r2, r3) {
    const body = $('compareBody'), best = Math.max(r1.score, r2.score, r3.score);
    const rows = [['總偏好分數', r1.score, r2.score, r3.score], ['搜尋節點', r1.nodesExplored, r2.nodesExplored, r3.nodesExplored],
        ['修剪次數', r1.pruneCount, r2.pruneCount, r3.pruneCount], ['時間 (ms)', r1.time.toFixed(2), r2.time.toFixed(2), r3.time.toFixed(2)],
        ['最優?', r1.score===best?'✅':'❌', r2.score===best?'✅':'❌', r3.score===best?'✅':'❌']];
    body.innerHTML = '';
    rows.forEach(row => { const tr = document.createElement('tr'); if (row[0]==='總偏好分數') tr.className='best-row';
        row.forEach(c => { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); }); body.appendChild(tr); });
    const bp1 = findBlockingPairs(r1.assignment).length, bp2 = findBlockingPairs(r2.assignment).length, bp3 = findBlockingPairs(r3.assignment).length;
    const bpr = document.createElement('tr'); ['Blocking pairs', bp1, bp2, bp3].forEach(c => { const td = document.createElement('td'); td.textContent = c; bpr.appendChild(td); }); body.appendChild(bpr);
    $('resultSection').style.display = 'none'; $('compareSection').style.display = 'block'; $('algoInfo').style.display = 'none';
}

// ========== Canvas ==========
function drawBipartite(assignment) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    if (students.length === 0 || rooms.length === 0) return;
    const cw = canvas.width, ch = canvas.height;
    const matH = $('matrixPanel').style.display !== 'none' ? $('matrixPanel').offsetHeight : 0;
    const drawH = ch - matH - 60, topY = 50;
    const leftX = cw * 0.18, rightX = cw * 0.7;
    const sSpacing = Math.min(48, (drawH - 30) / students.length);
    const sStartY = topY + (drawH - (students.length - 1) * sSpacing) / 2;

    // Right side: rooms (not individual beds)
    const rSpacing = Math.min(65, (drawH - 30) / rooms.length);
    const rStartY = topY + (drawH - (rooms.length - 1) * rSpacing) / 2;

    const sPos = students.map((_, i) => ({ x: leftX, y: sStartY + i * sSpacing }));
    const rPos = rooms.map((_, j) => ({ x: rightX, y: rStartY + j * rSpacing }));

    // Labels
    ctx.font = 'bold 13px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#4f46e5'; ctx.fillText('學生', leftX, topY - 10);
    ctx.fillStyle = '#ea580c'; ctx.fillText('房間', rightX, topY - 10);

    // Match lines (student → room)
    if (assignment) {
        assignment.forEach((slotJ, i) => {
            if (slotJ < 0 || i >= sPos.length) return;
            const slot = bedSlots[slotJ];
            const ri = slot.roomIdx;
            if (ri >= rPos.length) return;
            const sp = sPos[i], rp = rPos[ri];
            ctx.beginPath(); ctx.moveTo(sp.x + 18, sp.y); ctx.lineTo(rp.x - 30, rp.y);
            ctx.strokeStyle = '#059669'; ctx.lineWidth = 2; ctx.stroke();
            const mx = (sp.x + rp.x) / 2, my = (sp.y + rp.y) / 2;
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#059669'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(scoreMatrix[i][slotJ], mx, my);
        });
    }

    // Student nodes
    sPos.forEach((pos, i) => {
        const matched = assignment && assignment[i] >= 0;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = matched ? '#4f46e5' : '#94a3b8'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = matched ? '#6366f1' : '#cbd5e1'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(students[i].name, pos.x, pos.y);
    });

    // Room nodes (larger, showing info)
    rPos.forEach((pos, j) => {
        const r = rooms[j];
        const w = 56, h = 30;
        const matched = assignment && assignment.some(s => s >= 0 && bedSlots[s].roomIdx === j);
        ctx.beginPath(); roundRect(ctx, pos.x - w/2, pos.y - h/2, w, h, 6);
        ctx.fillStyle = matched ? '#ea580c' : '#94a3b8'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = matched ? '#f97316' : '#cbd5e1'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(r.number, pos.x, pos.y - 5);
        ctx.font = '9px Inter';
        ctx.fillText(`${r.type}人`, pos.x, pos.y + 8);
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
