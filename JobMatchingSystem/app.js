// =====================================================
// 學生宿舍最佳配對系統
// 演算法：分支定界法 / 貪婪法 / 動態規劃
// =====================================================

let n = 0, m = 0;
let scoreMatrix = [];
let currentResult = null;

const roomLabels = i => `${101 + i}`;
const studentLabels = i => String.fromCharCode(65 + i);

// DOM
const canvas = document.getElementById('matchCanvas');
const ctx = canvas.getContext('2d');
const applicantCountInput = document.getElementById('applicantCount');
const jobCountInput = document.getElementById('jobCount');
const btnGenerate = document.getElementById('btnGenerate');
const btnExample1 = document.getElementById('btnExample1');
const btnExample2 = document.getElementById('btnExample2');
const btnMatch = document.getElementById('btnMatch');
const btnCompare = document.getElementById('btnCompare');
const btnClear = document.getElementById('btnClear');
const matrixWrapper = document.getElementById('matrixWrapper');
const statApplicants = document.getElementById('statApplicants');
const statJobs = document.getElementById('statJobs');
const resultSection = document.getElementById('resultSection');
const compareSection = document.getElementById('compareSection');
const canvasSubtitle = document.getElementById('canvasSubtitle');
const algoInfo = document.getElementById('algoInfo');
const algoInfoTitle = document.getElementById('algoInfoTitle');
const algoInfoContent = document.getElementById('algoInfoContent');

// =====================================================
// Init
// =====================================================
function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    btnGenerate.addEventListener('click', generateRandom);
    btnExample1.addEventListener('click', loadExample1);
    btnExample2.addEventListener('click', loadExample2);
    btnMatch.addEventListener('click', runMatch);
    btnCompare.addEventListener('click', runCompare);
    btnClear.addEventListener('click', clearResults);
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    drawBipartite();
}

// =====================================================
// Data Management
// =====================================================
function generateRandom() {
    n = parseInt(applicantCountInput.value) || 4;
    m = parseInt(jobCountInput.value) || 4;
    if (n < 2) n = 2; if (m < 2) m = 2; if (n > 10) n = 10; if (m > 10) m = 10;
    scoreMatrix = [];
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < m; j++) row.push(Math.floor(Math.random() * 81) + 20);
        scoreMatrix.push(row);
    }
    refreshUI();
}

function loadExample1() {
    n = 4; m = 4;
    scoreMatrix = [
        [85, 60, 45, 70],
        [50, 90, 75, 55],
        [65, 40, 80, 95],
        [70, 85, 60, 50]
    ];
    applicantCountInput.value = 4; jobCountInput.value = 4;
    refreshUI();
}

function loadExample2() {
    n = 5; m = 5;
    scoreMatrix = [
        [92, 75, 60, 85, 50],
        [55, 88, 70, 45, 90],
        [80, 42, 95, 60, 65],
        [65, 90, 50, 78, 55],
        [70, 55, 85, 40, 92]
    ];
    applicantCountInput.value = 5; jobCountInput.value = 5;
    refreshUI();
}

function refreshUI() {
    statApplicants.textContent = n;
    statJobs.textContent = m;
    clearResults();
    renderMatrix();
    drawBipartite();
    canvasSubtitle.textContent = `已載入 ${n} 位學生 × ${m} 間房間`;
}

function renderMatrix() {
    const sNames = Array.from({length: n}, (_, i) => `學生 ${studentLabels(i)}`);
    const rNames = Array.from({length: m}, (_, j) => `房間 ${roomLabels(j)}`);
    let html = '<table class="score-matrix"><thead><tr><th></th>';
    rNames.forEach(rn => html += `<th>${rn}</th>`);
    html += '</tr></thead><tbody>';
    for (let i = 0; i < n; i++) {
        html += `<tr><th class="row-header">${sNames[i]}</th>`;
        for (let j = 0; j < m; j++) {
            html += `<td id="cell-${i}-${j}"><input type="number" min="0" max="100" value="${scoreMatrix[i][j]}" data-i="${i}" data-j="${j}"></td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    matrixWrapper.innerHTML = html;
    matrixWrapper.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', e => {
            const i = parseInt(e.target.dataset.i), j = parseInt(e.target.dataset.j);
            let v = parseInt(e.target.value);
            if (isNaN(v) || v < 0) v = 0; if (v > 100) v = 100;
            scoreMatrix[i][j] = v; e.target.value = v;
        });
    });
}

function readMatrixFromUI() {
    matrixWrapper.querySelectorAll('input').forEach(inp => {
        const i = parseInt(inp.dataset.i), j = parseInt(inp.dataset.j);
        scoreMatrix[i][j] = parseInt(inp.value) || 0;
    });
}

// =====================================================
// Algorithm 1: Branch-and-Bound (Personnel Assignment)
// =====================================================
function solveBnB() {
    readMatrixFromUI();
    const sz = Math.min(n, m);
    let bestScore = -1, bestAssign = null, nodesExplored = 0, pruneCount = 0;

    function upperBound(person, usedJobs) {
        let ub = 0;
        for (let p = person; p < sz; p++) {
            let mx = 0;
            for (let j = 0; j < m; j++) {
                if (!usedJobs.has(j)) mx = Math.max(mx, scoreMatrix[p][j]);
            }
            ub += mx;
        }
        return ub;
    }

    function search(person, currentScore, assignment, usedJobs) {
        nodesExplored++;
        if (person === sz) {
            if (currentScore > bestScore) { bestScore = currentScore; bestAssign = [...assignment]; }
            return;
        }
        if (currentScore + upperBound(person, usedJobs) <= bestScore) { pruneCount++; return; }
        for (let j = 0; j < m; j++) {
            if (!usedJobs.has(j)) {
                assignment[person] = j;
                usedJobs.add(j);
                search(person + 1, currentScore + scoreMatrix[person][j], assignment, usedJobs);
                usedJobs.delete(j);
            }
        }
    }

    const t0 = performance.now();
    search(0, 0, new Array(sz), new Set());
    const elapsed = performance.now() - t0;

    return { algo: '分支定界法 (B&B)', score: bestScore, assignment: bestAssign, nodesExplored, pruneCount, time: elapsed };
}

// =====================================================
// Algorithm 2: Greedy
// =====================================================
function solveGreedy() {
    readMatrixFromUI();
    const sz = Math.min(n, m);
    const pairs = [];
    for (let i = 0; i < n; i++)
        for (let j = 0; j < m; j++)
            pairs.push({ i, j, score: scoreMatrix[i][j] });
    pairs.sort((a, b) => b.score - a.score);

    const usedI = new Set(), usedJ = new Set();
    const assignment = new Array(sz).fill(-1);
    let total = 0, steps = 0;

    const t0 = performance.now();
    for (const p of pairs) {
        steps++;
        if (usedI.has(p.i) || usedJ.has(p.j)) continue;
        assignment[p.i] = p.j;
        usedI.add(p.i); usedJ.add(p.j);
        total += p.score;
        if (usedI.size === sz) break;
    }
    const elapsed = performance.now() - t0;

    return { algo: '貪婪演算法', score: total, assignment, nodesExplored: steps, pruneCount: 0, time: elapsed };
}

// =====================================================
// Algorithm 3: Dynamic Programming (Bitmask)
// =====================================================
function solveDP() {
    readMatrixFromUI();
    const sz = Math.min(n, m);
    if (sz > 20) { alert('DP 最多支援 20 人！'); return null; }
    const full = (1 << m) - 1;
    const dp = new Array(full + 1).fill(-1);
    const parent = new Array(full + 1).fill(-1);
    dp[0] = 0;
    let nodesExplored = 0;

    const t0 = performance.now();
    for (let mask = 0; mask <= full; mask++) {
        if (dp[mask] < 0) continue;
        const person = popcount(mask);
        if (person >= sz) continue;
        for (let j = 0; j < m; j++) {
            if (mask & (1 << j)) continue;
            nodesExplored++;
            const newMask = mask | (1 << j);
            const newScore = dp[mask] + scoreMatrix[person][j];
            if (newScore > dp[newMask]) {
                dp[newMask] = newScore;
                parent[newMask] = mask;
            }
        }
    }

    let bestMask = 0, bestScore = -1;
    for (let mask = 0; mask <= full; mask++) {
        if (popcount(mask) === sz && dp[mask] > bestScore) {
            bestScore = dp[mask]; bestMask = mask;
        }
    }

    const assignment = new Array(sz).fill(-1);
    let cur = bestMask;
    for (let p = sz - 1; p >= 0; p--) {
        const prev = parent[cur];
        const diff = cur ^ prev;
        assignment[p] = Math.log2(diff);
        cur = prev;
    }
    const elapsed = performance.now() - t0;

    return { algo: '動態規劃 (DP)', score: bestScore, assignment, nodesExplored, pruneCount: 0, time: elapsed };
}

function popcount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

// =====================================================
// Stability Check (Blocking Pairs)
// =====================================================
function findBlockingPairs(assignment) {
    const blocking = [];
    const sz = assignment.length;
    for (let i = 0; i < sz; i++) {
        for (let j = 0; j < m; j++) {
            if (assignment[i] === j) continue;
            if (scoreMatrix[i][j] > scoreMatrix[i][assignment[i]]) {
                const currentHolder = assignment.findIndex(x => x === j);
                if (currentHolder === -1) {
                    blocking.push({ i, j, reason: `學生 ${studentLabels(i)} 更偏好房間 ${roomLabels(j)}（${scoreMatrix[i][j]} > ${scoreMatrix[i][assignment[i]]}），且房間 ${roomLabels(j)} 目前無人` });
                } else if (scoreMatrix[i][j] > scoreMatrix[currentHolder][j]) {
                    blocking.push({ i, j, reason: `學生 ${studentLabels(i)} 對房間 ${roomLabels(j)} 的偏好 (${scoreMatrix[i][j]}) 高於目前住戶 ${studentLabels(currentHolder)} (${scoreMatrix[currentHolder][j]})` });
                }
            }
        }
    }
    return blocking;
}

// =====================================================
// UI Control
// =====================================================
function runMatch() {
    if (!n || !m || scoreMatrix.length === 0) { alert('請先生成或載入資料！'); return; }
    const algo = document.querySelector('input[name="algo"]:checked').value;
    let result;
    if (algo === 'bnb') result = solveBnB();
    else if (algo === 'greedy') result = solveGreedy();
    else result = solveDP();
    if (!result) return;
    currentResult = result;
    displayResult(result);
    drawBipartite(result.assignment);
}

function runCompare() {
    if (!n || !m || scoreMatrix.length === 0) { alert('請先生成或載入資料！'); return; }
    const r1 = solveBnB(), r2 = solveGreedy(), r3 = solveDP();
    displayCompare(r1, r2, r3);
    currentResult = r1;
    drawBipartite(r1.assignment);
}

function clearResults() {
    resultSection.style.display = 'none';
    compareSection.style.display = 'none';
    algoInfo.style.display = 'none';
    currentResult = null;
    document.querySelectorAll('.highlight-cell').forEach(c => c.classList.remove('highlight-cell'));
    drawBipartite();
}

function displayResult(r) {
    document.getElementById('resAlgo').textContent = r.algo;
    document.getElementById('resTotalScore').textContent = r.score + ' 分';
    document.getElementById('resNodes').textContent = r.nodesExplored;
    document.getElementById('resPrune').textContent = r.pruneCount;
    document.getElementById('resTime').textContent = r.time.toFixed(2) + ' ms';

    const details = document.getElementById('matchDetails');
    details.innerHTML = '';
    r.assignment.forEach((j, i) => {
        if (j < 0) return;
        const d = document.createElement('div');
        d.className = 'match-item';
        d.innerHTML = `<strong>學生 ${studentLabels(i)}</strong> → 房間 ${roomLabels(j)}（偏好分數：<strong>${scoreMatrix[i][j]}</strong>）`;
        details.appendChild(d);
    });

    const blocking = findBlockingPairs(r.assignment);
    const stabilityEl = document.getElementById('resStability');
    const bpEl = document.getElementById('blockingPairs');
    bpEl.innerHTML = '';
    if (blocking.length === 0) {
        stabilityEl.textContent = '✅ 穩定（無 blocking pair）';
        stabilityEl.style.color = '#059669';
    } else {
        stabilityEl.textContent = `⚠️ 不穩定（${blocking.length} 個 blocking pair）`;
        stabilityEl.style.color = '#dc2626';
        blocking.slice(0, 5).forEach(bp => {
            const d = document.createElement('div');
            d.className = 'blocking-item';
            d.textContent = bp.reason;
            bpEl.appendChild(d);
        });
    }

    document.querySelectorAll('.highlight-cell').forEach(c => c.classList.remove('highlight-cell'));
    r.assignment.forEach((j, i) => {
        if (j < 0) return;
        const cell = document.getElementById(`cell-${i}-${j}`);
        if (cell) cell.classList.add('highlight-cell');
    });

    algoInfoTitle.textContent = r.algo + ' 執行資訊';
    algoInfoContent.innerHTML = '';
    [`搜尋節點數：${r.nodesExplored}`, `修剪次數：${r.pruneCount}`, `最優分數：${r.score}`, `計算時間：${r.time.toFixed(2)} ms`].forEach((t, i) => {
        const d = document.createElement('div');
        d.className = 'step-item' + (i === 2 ? ' highlight' : '');
        d.textContent = t;
        algoInfoContent.appendChild(d);
    });
    algoInfo.style.display = 'block';
    resultSection.style.display = 'block';
    compareSection.style.display = 'none';
}

function displayCompare(r1, r2, r3) {
    const body = document.getElementById('compareBody');
    const bestScore = Math.max(r1.score, r2.score, r3.score);
    const rows = [
        ['總偏好分數', r1.score, r2.score, r3.score],
        ['搜尋節點數', r1.nodesExplored, r2.nodesExplored, r3.nodesExplored],
        ['修剪次數', r1.pruneCount, r2.pruneCount, r3.pruneCount],
        ['計算時間 (ms)', r1.time.toFixed(2), r2.time.toFixed(2), r3.time.toFixed(2)],
        ['是否最優', r1.score === bestScore ? '✅' : '❌', r2.score === bestScore ? '✅' : '❌', r3.score === bestScore ? '✅' : '❌'],
    ];
    body.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        if (row[0] === '總偏好分數') tr.className = 'best-row';
        row.forEach(cell => { const td = document.createElement('td'); td.textContent = cell; tr.appendChild(td); });
        body.appendChild(tr);
    });
    const bp1 = findBlockingPairs(r1.assignment).length;
    const bp2 = findBlockingPairs(r2.assignment).length;
    const bp3 = findBlockingPairs(r3.assignment).length;
    const bpRow = document.createElement('tr');
    ['Blocking pairs', bp1, bp2, bp3].forEach(c => { const td = document.createElement('td'); td.textContent = c; bpRow.appendChild(td); });
    body.appendChild(bpRow);
    resultSection.style.display = 'none';
    compareSection.style.display = 'block';
    algoInfo.style.display = 'none';
}

// =====================================================
// Canvas Drawing
// =====================================================
function drawBipartite(assignment) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    if (!n || !m) return;

    const cw = canvas.width, ch = canvas.height;
    const matrixH = document.getElementById('matrixPanel').offsetHeight || 0;
    const drawH = ch - matrixH - 60;
    const topY = 50;

    const leftX = cw * 0.22, rightX = cw * 0.65;
    const aSpacing = Math.min(60, (drawH - 40) / n);
    const jSpacing = Math.min(60, (drawH - 40) / m);
    const aStartY = topY + (drawH - (n - 1) * aSpacing) / 2;
    const jStartY = topY + (drawH - (m - 1) * jSpacing) / 2;

    const aPos = [], jPos = [];
    for (let i = 0; i < n; i++) aPos.push({ x: leftX, y: aStartY + i * aSpacing });
    for (let j = 0; j < m; j++) jPos.push({ x: rightX, y: jStartY + j * jSpacing });

    ctx.font = 'bold 13px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#4f46e5'; ctx.fillText('學生', leftX, topY - 10);
    ctx.fillStyle = '#ea580c'; ctx.fillText('房間', rightX, topY - 10);

    if (assignment) {
        assignment.forEach((j, i) => {
            if (j < 0 || i >= aPos.length || j >= jPos.length) return;
            const ap = aPos[i], jp = jPos[j];
            ctx.beginPath(); ctx.moveTo(ap.x + 22, ap.y); ctx.lineTo(jp.x - 22, jp.y);
            ctx.strokeStyle = '#059669'; ctx.lineWidth = 2.5; ctx.stroke();
            const mx = (ap.x + jp.x) / 2, my = (ap.y + jp.y) / 2;
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#059669'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(scoreMatrix[i][j], mx, my);
        });
    }

    aPos.forEach((pos, i) => {
        const matched = assignment && assignment[i] >= 0;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = matched ? '#4f46e5' : '#94a3b8'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = matched ? '#6366f1' : '#cbd5e1'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(studentLabels(i), pos.x, pos.y);
    });

    jPos.forEach((pos, j) => {
        const matched = assignment && assignment.includes(j);
        ctx.beginPath();
        roundRect(ctx, pos.x - 22, pos.y - 16, 44, 32, 6);
        ctx.fillStyle = matched ? '#ea580c' : '#94a3b8'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = matched ? '#f97316' : '#cbd5e1'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(roomLabels(j), pos.x, pos.y);
    });
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawGrid() {
    ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
}

init();
