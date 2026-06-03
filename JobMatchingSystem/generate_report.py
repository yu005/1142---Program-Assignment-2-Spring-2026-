# -*- coding: utf-8 -*-
"""
Program Assignment 3 — 學生宿舍最佳配對系統 Word 報告生成器
"""
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

def set_cell_shading(cell, color):
    shading = cell._element.get_or_add_tcPr()
    s = shading.makeelement(qn('w:shd'), {qn('w:val'): 'clear', qn('w:fill'): color})
    shading.append(s)

def add_page_number(doc):
    sect = doc.sections[-1]
    footer = sect.footer
    footer.is_linked_to_previous = False
    pg = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    pg.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = pg.add_run()
    f1 = run._element.makeelement(qn('w:fldChar'), {qn('w:fldCharType'): 'begin'}); run._element.append(f1)
    run2 = pg.add_run()
    it = run2._element.makeelement(qn('w:instrText'), {qn('xml:space'): 'preserve'}); it.text = ' PAGE '; run2._element.append(it)
    run3 = pg.add_run()
    f2 = run3._element.makeelement(qn('w:fldChar'), {qn('w:fldCharType'): 'end'}); run3._element.append(f2)

def p(doc, text, bold=False, size=12, color=None, align=None, spacing_after=6):
    para = doc.add_paragraph()
    para.paragraph_format.space_after = Pt(spacing_after)
    para.paragraph_format.line_spacing = 1.5
    if align: para.alignment = align
    run = para.add_run(text)
    run.font.size = Pt(size)
    run.font.name = '新細明體'
    run._element.rPr.rFonts.set(qn('w:eastAsia'), '新細明體')
    if bold: run.bold = True
    if color: run.font.color.rgb = RGBColor(*color)
    return para

def h1(doc, text): return p(doc, text, bold=True, size=14, spacing_after=8)
def h2(doc, text): return p(doc, text, bold=True, size=13, spacing_after=6)
def h3(doc, text): return p(doc, text, bold=True, size=12, spacing_after=4)

def add_table(doc, headers, rows, caption=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for pr in cell.paragraphs:
            pr.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in pr.runs: run.bold = True; run.font.size = Pt(10)
        set_cell_shading(cell, 'E8E0F0')
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = table.rows[ri + 1].cells[ci]
            cell.text = str(val)
            for pr in cell.paragraphs:
                pr.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for run in pr.runs: run.font.size = Pt(10)
    if caption: p(doc, caption, size=10, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=8)
    else: doc.add_paragraph()
    return table

def create_report():
    doc = Document()
    style = doc.styles['Normal']
    style.font.name = '新細明體'; style.font.size = Pt(12)
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '新細明體')
    style.paragraph_format.line_spacing = 1.5
    for section in doc.sections:
        section.top_margin = Cm(2.54); section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(3.17); section.right_margin = Cm(3.17)

    # ==================== 封面 ====================
    for _ in range(6): doc.add_paragraph()
    p(doc, 'Program Assignment 3', bold=True, size=24, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=12)
    p(doc, 'SPRING 2026', bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=24)
    for _ in range(3): doc.add_paragraph()
    p(doc, '課程：演算法概論', size=14, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=6)
    p(doc, '組別：第八組', size=14, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=6)
    p(doc, '組員：人工智慧三A  411203712  陳郁潔', size=12, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=4)
    p(doc, '　　　人工智慧三A  411221003  楊雅羽', size=12, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=4)
    p(doc, '　　　人工智慧三A  411211943  吳佳彥', size=12, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=4)
    p(doc, '　　　人工智慧三A  411211969  黃粲凱', size=12, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=4)
    doc.add_page_break()

    # ==================== 摘要 ====================
    h1(doc, '摘要')
    p(doc, '本報告設計並實作一套學生宿舍最佳配對資訊系統，以人員指派問題（Personnel Assignment Problem）為核心，將 n 位學生與 m 間宿舍房間進行最佳配對。系統透過偏好分數矩陣量化每位學生對每間房間的偏好程度，並使用三種演算法——分支定界法（Branch-and-Bound）、貪婪演算法（Greedy Algorithm）與動態規劃法（Dynamic Programming）——計算最佳配對方案，使總偏好分數最大化。')
    p(doc, '系統提供直覺的圖形化操作介面，包含可編輯的偏好分數矩陣、二部圖配對視覺化、三種演算法的一鍵比較功能，以及穩定性檢測（Blocking Pair 偵測）。系統為純前端應用，使用 HTML5 Canvas 搭配 JavaScript 實作，無需安裝任何軟體即可在瀏覽器中運行。')
    doc.add_page_break()

    # ==================== 一、情境、系統與問題定義 ====================
    h1(doc, '一、情境、系統與問題定義')

    h2(doc, '1-1 情境描述')
    p(doc, '每學期開學前，大學宿舍管理單位需要將申請住宿的學生分配到有限的宿舍房間中。每位學生對不同房間有不同的偏好（例如樓層高低、朝向、距離教室遠近、室友組合等），而每間房間的容納人數有限。目前多數學校採用隨機抽籤的方式分配宿舍，無法考量學生的個人偏好，經常導致學生對分配結果不滿意。')
    p(doc, '本系統的目標是將宿舍分配從「隨機抽籤」升級為「最佳化配對」，透過演算法找到一個使所有學生整體滿意度最高的分配方案。系統的運營環境如下：')
    p(doc, '• 學生：共有 n 位學生申請住宿，每位學生對每間房間有一個 0-100 的偏好分數。')
    p(doc, '• 宿舍房間：共有 m 間房間可供分配，每間房間最多容納 1 位學生（一對一配對）。')
    p(doc, '• 偏好分數：分數由學生根據房間條件（樓層、朝向、設備等）自行評估，分數越高代表越偏好。')
    p(doc, '• 配對目標：產生一個最佳的一對一分配方案，使所有配對的總偏好分數最大化。')

    h2(doc, '1-2 範例資料')
    p(doc, '以下為系統預設的範例資料（4 位學生 × 4 間房間），表格中的數值代表偏好分數（0-100）：')
    add_table(doc,
        ['', '房間 101', '房間 102', '房間 103', '房間 104'],
        [['學生 A', '85', '60', '45', '70'],
         ['學生 B', '50', '90', '75', '55'],
         ['學生 C', '65', '40', '80', '95'],
         ['學生 D', '70', '85', '60', '50']], '表 1  範例 1 偏好分數矩陣（4×4）')

    p(doc, '第二組範例為 5 位學生 × 5 間房間的較大規模資料：')
    add_table(doc,
        ['', '房間 101', '房間 102', '房間 103', '房間 104', '房間 105'],
        [['學生 A', '92', '75', '60', '85', '50'],
         ['學生 B', '55', '88', '70', '45', '90'],
         ['學生 C', '80', '42', '95', '60', '65'],
         ['學生 D', '65', '90', '50', '78', '55'],
         ['學生 E', '70', '55', '85', '40', '92']], '表 2  範例 2 偏好分數矩陣（5×5）')

    h2(doc, '1-3 資料模型')
    p(doc, '系統的資料模型可以用二部圖 G = (S ∪ R, E) 表示：')
    p(doc, '• S（學生集合）：S = {s₁, s₂, ..., sₙ}，每個 sᵢ 代表一位學生。')
    p(doc, '• R（房間集合）：R = {r₁, r₂, ..., rₘ}，每個 rₖ 代表一間宿舍房間。')
    p(doc, '• E（邊集合）：每條邊 (sᵢ, rₖ) 的權重為偏好分數 c(i,k) ∈ [0, 100]。')
    p(doc, '• 偏好分數矩陣 C：n × m 矩陣，C[i][k] = c(i,k)，量化學生 i 對房間 k 的偏好程度。')

    h2(doc, '1-4 系統設計')
    p(doc, '本系統是一套為大學宿舍管理單位打造的最佳配對資訊系統，提供一個直觀、高效的數位化平台，讓管理者輸入或生成學生的偏好分數矩陣，並自動計算最佳分配方案。')
    p(doc, '系統採用左右分欄的單頁應用佈局。左側主區域分為上半部的二部圖配對視覺化區域（使用 HTML5 Canvas 繪製）和下半部的可編輯偏好分數矩陣表格。右側側邊欄包含資料設定區（人數輸入、隨機生成、範例載入）、演算法選擇區（三種演算法的 Radio 選項）、執行按鈕（執行配對 / 三算法比較 / 清除結果）、以及結果展示區域。')

    h2(doc, '1-5 使用流程')
    h3(doc, '1-5.1 資料模型')
    p(doc, '核心資料結構為一個 n×m 的二維陣列 scoreMatrix，其中 scoreMatrix[i][j] 儲存學生 i 對房間 j 的偏好分數。配對結果以一維陣列 assignment 表示，其中 assignment[i] = j 代表學生 i 被分配到房間 j。')
    h3(doc, '1-5.2 使用流程')
    add_table(doc,
        ['步驟', '使用者操作', '系統回應'],
        [['1', '設定學生人數 n 和房間數量 m', '更新介面參數'],
         ['2', '點擊「隨機生成」或「範例1」', '生成偏好分數矩陣並顯示於表格'],
         ['3', '（可選）點擊矩陣儲存格修改分數', '即時更新對應的分數值'],
         ['4', '選擇演算法（B&B / 貪婪 / DP）', '準備對應的配對引擎'],
         ['5', '點擊「執行配對」', '計算最佳配對，在二部圖上顯示綠色連線'],
         ['6', '查看結果面板', '顯示總分、配對明細、搜尋統計、穩定性檢測'],
         ['7', '點擊「三算法比較」', '同時運行三種演算法，以表格比較各項指標']], '表 3  系統使用流程')

    h2(doc, '1-6 系統功能需求')
    add_table(doc,
        ['代號', '功能需求', '說明'],
        [['FR-1.1', '偏好分數矩陣視覺化', '以表格形式呈現 n×m 偏好分數矩陣'],
         ['FR-1.2', '矩陣即時編輯', '使用者可點擊任一儲存格直接修改分數（0-100）'],
         ['FR-1.3', '隨機資料生成', '一鍵隨機生成指定規模的偏好分數矩陣（範圍 20-100）'],
         ['FR-1.4', '範例資料載入', '提供 2 組預設範例（4×4 和 5×5）'],
         ['FR-2.1', '演算法選擇', '支援分支定界法、貪婪演算法、動態規劃三種演算法'],
         ['FR-2.2', '配對執行', '根據選擇的演算法計算最佳宿舍分配方案'],
         ['FR-3.1', '二部圖視覺化', '以 Canvas 繪製二部圖，左側圓形為學生，右側方形為房間，配對以綠色連線表示'],
         ['FR-3.2', '結果明細', '顯示總分、每對配對的分數、搜尋節點數、修剪次數、計算時間'],
         ['FR-3.3', '穩定性檢測', '配對完成後自動檢測是否存在 blocking pair'],
         ['FR-3.4', '三算法比較', '同時運行三種演算法，以比較表格呈現各項指標差異']], '表 4  功能需求表')

    h2(doc, '1-7 使用者介面設計')
    p(doc, '介面採用白色主題，配色以靛藍色（#4f46e5）代表學生節點、橙色（#ea580c）代表房間節點、綠色（#059669）代表配對連線。字型使用 Noto Sans TC 搭配 Inter，兼顧中英文排版的美觀性。')
    p(doc, '左側 Canvas 畫布以二部圖形式呈現配對關係，學生以圓形節點排列於左側，房間以圓角矩形節點排列於右側。配對成功的連線上方會顯示該對的偏好分數。下方的矩陣表格支援即時點擊編輯，已配對的儲存格會以綠色背景高亮標示。')

    h2(doc, '1-8 問題定義')
    h3(doc, '1-8.1 最佳指派問題 (Optimal Assignment Problem)')
    p(doc, '給定 n 位學生和 m 間房間（取 k = min(n,m) 進行一對一配對），以及偏好分數矩陣 C，找到一個分配方案使總偏好分數最大化。')
    p(doc, '形式化定義：')
    p(doc, '輸入：n×m 偏好分數矩陣 C，其中 c(i,j) ∈ [0, 100]。')
    p(doc, '輸出：排列 π: {1,...,k} → {1,...,m}（k = min(n,m)），使 Σᵢ c(i, π(i)) 最大化。')
    p(doc, '約束：每位學生最多分配到一間房間，每間房間最多分配一位學生。')

    h3(doc, '1-8.2 穩定性問題 (Stability Problem)')
    p(doc, '配對完成後，檢測是否存在「不穩定配對」（Blocking Pair）：即存在某位學生 sᵢ 對某間房間 rₖ 的偏好分數高於其目前配到的房間，同時 sᵢ 對 rₖ 的分數也高於 rₖ 目前住戶對 rₖ 的分數。')
    p(doc, '形式化定義：若存在 (sᵢ, rₖ) 使得 c(i,k) > c(i, π(i)) 且 c(i,k) > c(π⁻¹(k), k)，則稱 (sᵢ, rₖ) 為 blocking pair，該配對結果不穩定。')

    h3(doc, '1-8.3 系統限制條件')
    p(doc, '• 偏好分數為 0-100 的正整數。')
    p(doc, '• 分支定界法和動態規劃法受限於組合爆炸，建議規模 n, m ≤ 10。')
    p(doc, '• 系統為一對一配對（單人房），不支援多人一房的情境。')

    h3(doc, '1-8.4 最佳化目標')
    p(doc, '主要目標：最大化 Σᵢ c(i, π(i))（總偏好分數），在所有合法的一對一分配方案中找到全域最優解。')
    p(doc, '次要目標：最小化 blocking pair 數量，提升分配結果的公平性與穩定性。')

    h2(doc, '1-9 AI 工具協助項目')
    p(doc, '在情境設計階段，使用 AI 輔助工具協助整理問題的形式化定義與系統功能需求表的結構化描述。具體流程：作者先定義問題場景（宿舍配對），再由 AI 協助將問題轉化為數學形式（集合、矩陣、約束條件），作者進行校對與調整。')
    doc.add_page_break()

    # ==================== 二、提出的演算法 ====================
    h1(doc, '二、提出的演算法')

    h2(doc, '2-1 分支定界法 (Branch-and-Bound)')
    p(doc, '本系統的核心演算法，用於解決最佳指派問題。此演算法直接對應課堂教授的「人員指派問題」，透過系統性搜尋與智慧修剪找到全域最優解。')
    p(doc, '演算法步驟：')
    p(doc, '1. 初始化全域最佳分數 bestScore = 0，最佳指派 bestAssign = null。')
    p(doc, '2. 從第 1 位學生開始，以深度優先搜尋（DFS）逐一決定每位學生分配到哪間房間。')
    p(doc, '3. 上界函數（Upper Bound）：對尚未分配的每位學生，取其在剩餘可用房間中的最大偏好分數，將這些最大值加總，作為「剩餘最多還能獲得多少分」的估計。')
    p(doc, '4. 修剪條件：若「當前累計分數 + 上界估計 ≤ bestScore」，表示此分支即使在最理想的情況下也不可能超越已知最佳解，立即修剪。')
    p(doc, '5. 當所有學生都已分配完畢（到達葉節點），若當前總分 > bestScore，則更新全域最佳解。')
    p(doc, '6. 回溯（backtrack），將房間標記為可用，嘗試下一個分配方案。')
    p(doc, '時間複雜度：最壞情況 O(n!)，但透過上界修剪，實際搜尋量遠小於全排列。')
    p(doc, '空間複雜度：O(n)（遞迴棧深度）。')

    h2(doc, '2-2 貪婪演算法 (Greedy Algorithm)')
    p(doc, '用於快速產生近似解，作為效能對照組。')
    p(doc, '演算法步驟：')
    p(doc, '1. 將所有 n×m 個 (學生, 房間) 配對的偏好分數由大到小排序。')
    p(doc, '2. 依序取出分數最高的配對，若該學生和該房間都尚未被配對，則建立配對關係。')
    p(doc, '3. 重複步驟 2，直到已配對的數量達到 min(n,m) 或所有配對都已檢查完畢。')
    p(doc, '時間複雜度：O(n²·log n)（排序主導）。')
    p(doc, '特點：不保證找到最優解，因為每一步只看眼前最大利益，可能錯過全局更優的組合。')

    h2(doc, '2-3 動態規劃法 (Dynamic Programming)')
    p(doc, '使用位元遮罩（Bitmask）技術的精確解法，從另一個角度求解最佳指派問題。')
    p(doc, '演算法步驟：')
    p(doc, '1. 用位元遮罩 mask 表示已被佔用的房間集合。例如 mask = 0101 表示房間 101 和房間 103 已被佔用。popcount(mask) 代表已分配的學生數。')
    p(doc, '2. 定義 dp[mask] = 前 popcount(mask) 位學生分配完畢、佔用房間集合為 mask 時的最大總分。初始值 dp[0] = 0。')
    p(doc, '3. 轉移方程：dp[mask | (1<<j)] = max(dp[mask] + c(person, j))，其中 person = popcount(mask)，j 為尚未在 mask 中的房間。')
    p(doc, '4. 最終答案為所有 popcount(mask) = k 的 dp[mask] 中的最大值。')
    p(doc, '5. 透過 parent 陣列回溯，重建完整的分配方案。')
    p(doc, '時間複雜度：O(m × 2ᵐ)。空間複雜度：O(2ᵐ)。限制：m ≤ 20。')

    h2(doc, '2-4 演算假設')
    p(doc, '• 偏好分數為已知的非負整數，由學生事先填寫或系統隨機生成。')
    p(doc, '• 配對為一對一，每位學生最多分配到一間房間，每間房間最多分配一位學生。')
    p(doc, '• 所有學生對所有房間都有偏好分數（構成完全二部圖）。')

    h2(doc, '2-5 設計考慮因素')
    p(doc, '• 選擇分支定界法作為主要演算法，因為它直接對應課堂教授的人員指派問題，且保證找到全域最優解。')
    p(doc, '• 上界函數的設計是影響修剪效率的關鍵。本系統採用「每個未分配學生在剩餘可用房間中的最大分數之和」作為上界。')
    p(doc, '• 貪婪法和 DP 分別代表「快速但可能不精確」和「精確但耗記憶體」兩種不同的設計取捨。')

    h2(doc, '2-6 替代方法分析')
    add_table(doc,
        ['方法', '核心概念', '評估'],
        [['分支定界法 (B&B)\n（本系統採用）', '以 DFS 遍歷所有分配組合，\n利用上界函數修剪無效分支', '優點：保證最優解，修剪後效率高\n缺點：最壞 O(n!)\n評估：適合中小規模（n ≤ 15）'],
         ['貪婪演算法\n（本系統採用）', '將所有配對按分數排序，\n每次貪心選取最高分且可用的配對', '優點：速度極快 O(n²log n)\n缺點：不保證最優解\n評估：適合大規模快速近似'],
         ['動態規劃法\n（本系統採用）', '用位元遮罩記錄已佔用的\n房間集合，填表求解', '優點：保證最優，時間穩定 O(m·2ᵐ)\n缺點：空間 O(2ᵐ)，m>20 不可行\n評估：中等規模精確解']], '表 5  三種演算法比較')

    h2(doc, '2-7 AI 工具協助項目')
    p(doc, '在設計演算法時，使用 AI 輔助工具協助整理各演算法的步驟描述與複雜度分析。具體流程：作者先列出課堂所學的演算法（分支定界法、貪婪法、動態規劃），再由 AI 協助將虛擬碼整理為結構化的中文步驟描述，作者進行校對與調整。')
    doc.add_page_break()

    # ==================== 三、實作與結果 ====================
    h1(doc, '三、實作與結果')

    h2(doc, '3-1 程式實作概述')
    p(doc, '系統使用純前端技術（HTML5 + CSS + JavaScript）實作，無需後端伺服器。繪圖使用 HTML5 Canvas API 繪製二部圖，所有演算法以 JavaScript 實作於 app.js 中。使用者直接在瀏覽器開啟 index.html 即可使用，系統已部署至 GitHub Pages 供線上存取。')

    h2(doc, '3-2 主要資料結構')
    p(doc, '• scoreMatrix（二維陣列）：scoreMatrix[i][j] 儲存學生 i 對房間 j 的偏好分數。')
    p(doc, '• assignment（一維陣列）：assignment[i] = j 表示學生 i 被分配到房間 j。')
    p(doc, '• usedJobs（Set 集合）：B&B 使用，記錄目前搜尋分支中已被佔用的房間索引。')
    p(doc, '• dp[mask]（一維陣列）：DP 使用，索引為位元遮罩 mask，dp[mask] 記錄佔用房間集合為 mask 時的最大總分。')
    p(doc, '• parent[mask]（一維陣列）：DP 使用，記錄每個狀態的前驅狀態，供回溯重建分配方案。')

    h2(doc, '3-3 核心搜尋函式')
    p(doc, '分支定界法（solveBnB 函式）：')
    p(doc, 'function solveBnB() {')
    p(doc, '    const sz = Math.min(n, m);')
    p(doc, '    let bestScore = -1, bestAssign = null;')
    p(doc, '    let nodesExplored = 0, pruneCount = 0;')
    p(doc, '    function upperBound(person, usedJobs) {')
    p(doc, '        let ub = 0;')
    p(doc, '        for (let p = person; p < sz; p++) {')
    p(doc, '            let mx = 0;')
    p(doc, '            for (let j = 0; j < m; j++)')
    p(doc, '                if (!usedJobs.has(j)) mx = Math.max(mx, scoreMatrix[p][j]);')
    p(doc, '            ub += mx;')
    p(doc, '        }')
    p(doc, '        return ub;')
    p(doc, '    }')
    p(doc, '    function search(person, currentScore, assignment, usedJobs) {')
    p(doc, '        nodesExplored++;')
    p(doc, '        if (person === sz) {')
    p(doc, '            if (currentScore > bestScore)')
    p(doc, '                { bestScore = currentScore; bestAssign = [...assignment]; }')
    p(doc, '            return;')
    p(doc, '        }')
    p(doc, '        if (currentScore + upperBound(person, usedJobs) <= bestScore)')
    p(doc, '            { pruneCount++; return; }')
    p(doc, '        for (let j = 0; j < m; j++) {')
    p(doc, '            if (!usedJobs.has(j)) {')
    p(doc, '                assignment[person] = j;  usedJobs.add(j);')
    p(doc, '                search(person+1, currentScore+scoreMatrix[person][j], assignment, usedJobs);')
    p(doc, '                usedJobs.delete(j);')
    p(doc, '            }')
    p(doc, '        }')
    p(doc, '    }')
    p(doc, '    search(0, 0, new Array(sz), new Set());')
    p(doc, '}')

    h2(doc, '3-4 測試案例與輸出結果')

    h3(doc, '測試案例 1：4×4 範例')
    add_table(doc,
        ['演算法', '總偏好分數', '配對結果', '搜尋節點數', '修剪次數'],
        [['分支定界法', '340', 'A→101, B→103, C→104, D→102', '15', '5'],
         ['貪婪演算法', '330', 'A→101, B→102, C→104, D→103', '11', '0'],
         ['動態規劃法', '340', 'A→101, B→103, C→104, D→102', '32', '0']], '表 6  測試案例 1 結果')
    p(doc, '分析：分支定界法和動態規劃法都找到了最優解 340 分（A→101: 85, B→103: 75, C→104: 95, D→102: 85）。貪婪演算法得到 330 分，差距為 10 分（2.9%），原因是貪婪法優先選了 B→102（90 分），但這導致 D 只能選到次優的 103（60 分），整體不如 B→103 + D→102 的組合（75 + 85 = 160 > 90 + 60 = 150）。')

    h3(doc, '測試案例 2：5×5 範例')
    add_table(doc,
        ['演算法', '總偏好分數', '配對結果', '搜尋節點數', '修剪次數'],
        [['分支定界法', '445', 'A→101, B→102, C→103, D→104, E→105', '-', '-'],
         ['貪婪演算法', '414', 'A→101, B→104, C→103, D→102, E→105', '-', '0'],
         ['動態規劃法', '445', 'A→101, B→102, C→103, D→104, E→105', '-', '0']], '表 7  測試案例 2 結果')
    p(doc, '分析：最優解為 445 分（92+88+95+78+92）。貪婪演算法得到 414 分，差距為 31 分（7.0%）。差距擴大的原因是貪婪法先選了 D→102（90 分），佔據了 B 的最佳選擇，使 B 被迫分配到偏好分數僅 45 的房間 104，嚴重拖累了總分。')

    h2(doc, '3-5 案例手算驗證')
    p(doc, '以測試案例 1（4×4 範例）進行分支定界法的完整手算驗證。')
    p(doc, '偏好分數矩陣：A=[85,60,45,70], B=[50,90,75,55], C=[65,40,80,95], D=[70,85,60,50]')
    p(doc, '')
    p(doc, '搜尋過程（以搜尋樹表示）：')
    p(doc, '第 1 層：分配學生 A')
    p(doc, '├─ A→101 (85分)，進入第 2 層')
    p(doc, '│  ├─ B→102 (90)，累計 175')
    p(doc, '│  │  ├─ C→103 (80)，累計 255')
    p(doc, '│  │  │  └─ D→104 (50)，累計 305 → 更新 bestScore=305')
    p(doc, '│  │  └─ C→104 (95)，累計 270')
    p(doc, '│  │     └─ D→103 (60)，累計 330 → 更新 bestScore=330')
    p(doc, '│  ├─ B→103 (75)，累計 160')
    p(doc, '│  │  ├─ C→102 (40)，UB=200+50=250 ≤ 330 → 修剪 ✂️')
    p(doc, '│  │  └─ C→104 (95)，累計 255')
    p(doc, '│  │     └─ D→102 (85)，累計 340 → 更新 bestScore=340 ✓')
    p(doc, '│  └─ B→104 (55)，UB=140+180=320 ≤ 340 → 修剪 ✂️')
    p(doc, '├─ A→102 (60)，UB=60+240=300 ≤ 340 → 修剪 ✂️')
    p(doc, '├─ A→103 (45)，UB=45+270=315 ≤ 340 → 修剪 ✂️')
    p(doc, '└─ A→104 (70)，UB=70+255=325 ≤ 340 → 修剪 ✂️')
    p(doc, '')
    p(doc, '搜尋結果：最佳分數 340（A→101, B→103, C→104, D→102），搜尋節點數 15，修剪次數 5。')
    p(doc, '全排列總數 4!=24，修剪效率：只探索了 15 個節點即找到最優解，避免了超過一半的無效搜尋。')

    h2(doc, '3-6 三組測試結果比較')
    add_table(doc,
        ['項目', '分支定界法 (B&B)', '貪婪演算法', '動態規劃法 (DP)'],
        [['測試 1 總分', '340（最優）', '330', '340（最優）'],
         ['測試 2 總分', '445（最優）', '414', '445（最優）'],
         ['是否保證最優', '✅ 是', '❌ 否', '✅ 是'],
         ['時間複雜度', 'O(n!)，修剪後遠小', 'O(n² log n)', 'O(m × 2ᵐ)'],
         ['空間複雜度', 'O(n)', 'O(n²)', 'O(2ᵐ)'],
         ['可處理規模', 'n ≤ 15', '無上限', 'm ≤ 20'],
         ['課堂對應', '分支定界 + 人員指派', '貪婪演算法', '動態規劃']], '表 8  三種演算法綜合比較')
    p(doc, '結果分析：分支定界法和動態規劃法在所有測試案例中都找到了相同的最優解，驗證了兩者作為精確解法的正確性。貪婪演算法在 4×4 案例中差距 2.9%，在 5×5 案例中差距擴大至 7.0%，顯示問題規模越大，貪婪法的近似誤差越明顯。')

    h2(doc, '3-7 實作章節的 AI 工具協助項目')
    p(doc, '在實作階段，使用 AI 輔助工具協助以下工作：')
    p(doc, '1. 程式碼框架生成：作者提供演算法虛擬碼和資料結構設計，由 AI 協助轉為 JavaScript 實作，作者手動驗證程式邏輯。')
    p(doc, '2. Canvas 視覺化：AI 協助實作二部圖的節點佈局計算和配對連線繪製邏輯。')
    p(doc, '3. 測試案例驗算：由 AI 協助進行分支定界法的搜尋樹手算驗證，作者核對結果與系統輸出一致後採用。')
    doc.add_page_break()

    # ==================== 四、討論 ====================
    h1(doc, '四、討論')

    h2(doc, '4-1 系統優點')
    p(doc, '• 多演算法比較：系統同時提供三種演算法，使用者可以直觀比較各算法在效能、精確度與資源消耗上的差異。')
    p(doc, '• 穩定性檢測：配對完成後自動偵測 blocking pair，讓管理者了解分配結果的公平性。')
    p(doc, '• 互動式介面：偏好分數矩陣支援即時點擊編輯，方便探索不同情境的分配結果。')
    p(doc, '• 零安裝部署：純前端應用，只需瀏覽器即可使用。')

    h2(doc, '4-2 系統限制')
    p(doc, '• 規模限制：分支定界法在 n > 15 時計算時間急劇增加，動態規劃法在 m > 20 時記憶體不足。')
    p(doc, '• 一對一配對：系統僅支援單人房的一對一配對，未支援多人一房的情境。')
    p(doc, '• 單輪配對：系統為一次性分配，不支援動態調整後的重新配對。')
    p(doc, '• 資料不持久化：重新載入頁面後資料消失。')

    h2(doc, '4-3 結論與反思')
    h3(doc, '4-3.1 系統成果')
    p(doc, '本系統成功實作了三種課堂教授的演算法來解決學生宿舍分配問題。分支定界法在所有測試案例中都找到了全域最優解，且透過上界修剪有效縮減了搜尋空間（例如 4×4 案例中，24 種全排列只需探索 15 個節點）。貪婪演算法雖然無法保證最優，但能在極短時間內產出接近最優的近似解。動態規劃法則從另一個角度驗證了分支定界法結果的正確性。')

    h3(doc, '4-3.2 未來改進的方向')
    p(doc, '• 擴展為多人一房：支援每間房間設定容納人數上限，更貼近實際宿舍分配場景。')
    p(doc, '• 加入偏好排序：除了偏好分數外，加入學生的主觀排序，實作穩定婚姻演算法（Gale-Shapley）。')
    p(doc, '• 資料持久化：支援 JSON 匯出和匯入功能。')
    p(doc, '• 大規模近似演算法：引入模擬退火或遺傳演算法處理大規模問題。')

    h3(doc, '4-3.3 遇到的挑戰')
    p(doc, '• 上界函數設計：初始版本使用過於寬鬆的上界，修剪效果不佳。後來改進為「每個未分配學生在剩餘房間中的最大分數之和」，顯著提升了修剪效率。')
    p(doc, '• DP 的記憶體管理：位元遮罩 DP 的空間需求為 O(2ᵐ)，透過只使用一維 dp 陣列減少了記憶體使用量。')
    p(doc, '• 二部圖的佈局計算：需根據學生和房間的數量動態調整節點間距，確保在不同規模下都能清晰展示。')

    add_page_number(doc)
    output_path = os.path.join(os.path.dirname(__file__), 'Program_Assignment_3_Report.docx')
    doc.save(output_path)
    print(f'[OK] Report saved: {output_path}')

if __name__ == '__main__':
    create_report()
