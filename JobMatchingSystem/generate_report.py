# -*- coding: utf-8 -*-
"""
Program Assignment 3 — 學生宿舍最佳配對系統 Word 報告生成器（完整版：支援多房型）
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
    sect = doc.sections[-1]; footer = sect.footer; footer.is_linked_to_previous = False
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
    para.paragraph_format.space_after = Pt(spacing_after); para.paragraph_format.line_spacing = 1.5
    if align: para.alignment = align
    run = para.add_run(text)
    run.font.size = Pt(size); run.font.name = '新細明體'
    run._element.rPr.rFonts.set(qn('w:eastAsia'), '新細明體')
    if bold: run.bold = True
    if color: run.font.color.rgb = RGBColor(*color)
    return para

def h1(d, t): return p(d, t, bold=True, size=14, spacing_after=8)
def h2(d, t): return p(d, t, bold=True, size=13, spacing_after=6)
def h3(d, t): return p(d, t, bold=True, size=12, spacing_after=4)

def add_table(doc, headers, rows, caption=None):
    table = doc.add_table(rows=1+len(rows), cols=len(headers))
    table.style = 'Table Grid'; table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]; cell.text = h
        for pr in cell.paragraphs:
            pr.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in pr.runs: run.bold = True; run.font.size = Pt(10)
        set_cell_shading(cell, 'E8E0F0')
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = table.rows[ri+1].cells[ci]; cell.text = str(val)
            for pr in cell.paragraphs:
                pr.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for run in pr.runs: run.font.size = Pt(10)
    if caption: p(doc, caption, size=10, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=8)
    else: doc.add_paragraph()

def create_report():
    doc = Document()
    style = doc.styles['Normal']; style.font.name = '新細明體'; style.font.size = Pt(12)
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '新細明體'); style.paragraph_format.line_spacing = 1.5
    for s in doc.sections: s.top_margin=Cm(2.54); s.bottom_margin=Cm(2.54); s.left_margin=Cm(3.17); s.right_margin=Cm(3.17)

    # === 封面 ===
    for _ in range(6): doc.add_paragraph()
    p(doc, 'Program Assignment 3', bold=True, size=24, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=12)
    p(doc, 'SPRING 2026', bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=24)
    for _ in range(3): doc.add_paragraph()
    p(doc, '課程：演算法概論', size=14, align=WD_ALIGN_PARAGRAPH.CENTER)
    p(doc, '組別：第八組', size=14, align=WD_ALIGN_PARAGRAPH.CENTER)
    for name in ['人工智慧三A  411203712  陳郁潔','人工智慧三A  411221003  楊雅羽','人工智慧三A  411211943  吳佳彥','人工智慧三A  411211969  黃粲凱']:
        p(doc, f'組員：{name}' if '陳' in name else f'　　　{name}', size=12, align=WD_ALIGN_PARAGRAPH.CENTER, spacing_after=4)
    doc.add_page_break()

    # === 摘要 ===
    h1(doc, '摘要')
    p(doc, '本報告設計並實作一套學生宿舍最佳配對資訊系統。系統支援多種房型（雙人房、三人房、四人房），每間房間具有樓層、冷氣、獨立衛浴、朝向等屬性。學生可設定個人偏好條件（偏好房型、樓層、設備需求等），系統自動計算每位學生對每個床位的偏好分數，再透過三種演算法——分支定界法（Branch-and-Bound）、貪婪演算法（Greedy）與動態規劃法（Dynamic Programming）——計算最佳配對方案，使全體學生的總偏好分數最大化。')
    p(doc, '系統將多人房拆分為個別床位，轉換為一對一指派問題後求解。提供直覺的圖形化操作介面，包含房間屬性設定、學生偏好表單、自動產生的偏好分數矩陣、二部圖配對視覺化、三種演算法一鍵比較功能，以及穩定性檢測（Blocking Pair 偵測）。')
    doc.add_page_break()

    # === 一、情境 ===
    h1(doc, '一、情境、系統與問題定義')

    h2(doc, '1-1 情境描述')
    p(doc, '每學期開學前，大學宿舍管理單位需要將申請住宿的學生分配到有限的宿舍房間中。每位學生對不同房間有不同的偏好——有人偏好低樓層的雙人房、有人希望住在有獨立衛浴的高樓層。目前多數學校採用隨機抽籤的方式分配宿舍，無法考量學生的個人偏好，經常導致分配結果不理想。')
    p(doc, '本系統的目標是將宿舍分配從「隨機抽籤」升級為「最佳化配對」。系統的運營環境如下：')
    p(doc, '• 房間：共有 m 間宿舍房間，每間房間有以下屬性：')
    p(doc, '　- 房型：雙人房（2床位）/ 三人房（3床位）/ 四人房（4床位）')
    p(doc, '　- 樓層：1 樓至 6 樓以上')
    p(doc, '　- 設備：是否有冷氣、是否有獨立衛浴')
    p(doc, '　- 朝向：南向 / 北向')
    p(doc, '• 學生：共有 n 位學生申請住宿，每位學生設定個人偏好條件：')
    p(doc, '　- 偏好房型：雙人房 / 三人房 / 四人房 / 不限')
    p(doc, '　- 偏好樓層：低樓層(1-2F) / 中樓層(3-4F) / 高樓層(5F+) / 不限')
    p(doc, '　- 冷氣需求：需要 / 不限')
    p(doc, '　- 衛浴需求：需要 / 不限')
    p(doc, '　- 朝向偏好：南向 / 北向 / 不限')
    p(doc, '• 配對目標：產生一個最佳分配方案，使所有學生的總偏好分數最大化。')

    h2(doc, '1-2 範例資料')
    p(doc, '範例 1 包含 4 間房間（2 間雙人房 + 1 間三人房 + 1 間四人房，共 11 個床位），分配 11 位學生：')
    add_table(doc,
        ['房號', '房型', '樓層', '冷氣', '衛浴', '朝向', '床位數'],
        [['201','雙人房','2F','✓','✓','南向','2'],
         ['202','雙人房','2F','✓','✗','北向','2'],
         ['301','三人房','3F','✗','✓','南向','3'],
         ['401','四人房','4F','✓','✓','北向','4']], '表 1  範例 1 房間屬性')

    h2(doc, '1-3 資料模型')
    p(doc, '系統的核心資料模型：')
    p(doc, '• 房間物件 Room = {number, type, floor, ac, bath, orient}，其中 type ∈ {2, 3, 4}。')
    p(doc, '• 床位展開：每間房間依其 type 展開為 type 個床位槽（Bed Slot）。例如一間三人房展開為 3 個床位槽，每個床位槽繼承該房間的所有屬性。')
    p(doc, '• 學生物件 Student = {name, prefType, prefFloor, prefAC, prefBath, prefOrient}。')
    p(doc, '• 偏好分數矩陣 C：n × totalBeds 矩陣，C[i][j] 為學生 i 對床位槽 j 的偏好分數（0-100），由系統根據學生偏好與床位屬性自動計算。')
    p(doc, '• 配對結果 assignment：一維陣列，assignment[i] = j 表示學生 i 被分配到床位槽 j。')

    h2(doc, '1-4 系統設計')
    p(doc, '本系統是一套為大學宿舍管理單位打造的最佳配對資訊系統。系統採用左右分欄的單頁應用佈局：')
    p(doc, '左側主區域：上方為二部圖配對視覺化（Canvas），左側為學生節點、右側為房間節點（含房型與容量資訊），配對以綠色連線表示。下方為系統自動計算的偏好分數矩陣（唯讀），以高亮顯示已配對的儲存格。')
    p(doc, '右側側邊欄由上而下包含：(1) 房間設定區——可設定雙人房/三人房/四人房的數量、起始樓層和房號，系統自動生成房間並隨機分配設備屬性，也可手動修改每間房的冷氣、衛浴和朝向。(2) 學生偏好設定區——可設定學生人數，每位學生透過下拉選單設定偏好房型、偏好樓層、冷氣需求、衛浴需求和朝向偏好。(3) 演算法選擇與執行區——支援三種演算法及一鍵比較。(4) 結果展示區——包含分數、配對明細、穩定性檢測和比較表格。')

    h2(doc, '1-5 偏好分數計算規則')
    p(doc, '偏好分數 c(i,j) 的計算規則如下，滿分 100 分：')
    add_table(doc,
        ['評分項目', '滿分', '完全符合', '部分符合', '不限', '不符合'],
        [['房型偏好','35','35','15（差1級）','25','5'],
         ['樓層偏好','25','25','15（相鄰區間）','18','5'],
         ['冷氣需求','15','15','—','10','0'],
         ['衛浴需求','15','15','—','10','0'],
         ['朝向偏好','10','10','—','7','3']], '表 2  偏好分數計算規則')
    p(doc, '例如：學生 A 偏好「雙人房、低樓層、要冷氣、不限衛浴、南向」，房間 201 是「雙人房、2F、有冷氣、有衛浴、南向」→ 分數 = 35+25+15+10+10 = 95 分。')

    h2(doc, '1-6 使用流程')
    add_table(doc,
        ['步驟', '使用者操作', '系統回應'],
        [['1','設定雙人/三人/四人房數量、起始樓層','—'],
         ['2','點擊「生成房間」或載入範例','生成房間列表，顯示各房屬性'],
         ['3','（可選）修改房間的冷氣/衛浴/朝向','即時更新房間屬性'],
         ['4','設定學生人數，點擊「生成學生」','生成學生偏好表單（隨機初始化）'],
         ['5','調整每位學生的偏好條件','學生下拉選單即時更新'],
         ['6','點擊「計算偏好分數」','自動計算並顯示 n×totalBeds 偏好分數矩陣'],
         ['7','選擇演算法，點擊「執行配對」','計算最佳配對，二部圖顯示綠色連線'],
         ['8','點擊「三算法比較」','同時運行三種演算法，比較結果']], '表 3  系統使用流程')

    h2(doc, '1-7 系統功能需求')
    add_table(doc,
        ['代號', '功能需求', '說明'],
        [['FR-1.1','多房型設定','支援雙人房/三人房/四人房的混合配置'],
         ['FR-1.2','房間屬性編輯','每間房可設定冷氣、衛浴、朝向'],
         ['FR-1.3','學生偏好表單','每位學生可設定 5 項偏好（房型/樓層/AC/衛浴/朝向）'],
         ['FR-1.4','自動偏好分數計算','根據偏好 vs 屬性的匹配度自動計算 0-100 分'],
         ['FR-1.5','範例資料載入','提供 2 組預設範例'],
         ['FR-2.1','三種演算法','分支定界法、貪婪法、動態規劃'],
         ['FR-3.1','二部圖視覺化','學生→房間的配對關係圖'],
         ['FR-3.2','分組結果展示','按房間分組顯示入住學生及分數'],
         ['FR-3.3','穩定性檢測','偵測 blocking pair'],
         ['FR-3.4','三算法比較表','比較總分、節點數、修剪次數、時間']], '表 4  功能需求表')

    h2(doc, '1-8 使用者介面設計')
    p(doc, '介面採用白色主題。學生節點以靛藍色圓形表示，房間節點以橙色圓角矩形表示（內含房號和人數），配對連線為綠色並標註偏好分數。偏好分數矩陣的欄標題為「房號-床號」格式（如 201-1、201-2），已配對的儲存格以綠色高亮。')

    h2(doc, '1-9 問題定義')
    h3(doc, '1-9.1 最佳指派問題 (Optimal Assignment Problem)')
    p(doc, '將 n 位學生分配到 totalBeds 個床位（每間房依房型展開），使總偏好分數最大化。')
    p(doc, '形式化：輸入 n×totalBeds 偏好分數矩陣 C，找到排列 π 使 Σᵢ c(i, π(i)) 最大化。')
    p(doc, '約束：每位學生最多分配到一個床位，每個床位最多分配一位學生。')

    h3(doc, '1-9.2 穩定性問題')
    p(doc, '檢測是否存在 blocking pair (sᵢ, bed_j)：學生 sᵢ 對 bed_j 的偏好分數高於其目前分配的床位，且也高於 bed_j 目前住戶對該床位的分數。')

    h3(doc, '1-9.3 系統限制條件')
    p(doc, '• 偏好分數為 0-100 的整數，由系統自動計算。')
    p(doc, '• 建議總床位數 ≤ 15（B&B）或 ≤ 20（DP）。')
    p(doc, '• 系統為一次性分配，不支援多輪重新配對。')

    h2(doc, '1-10 AI 工具協助項目')
    p(doc, '在情境設計階段，使用 AI 輔助工具協助整理偏好分數的計算規則與問題的形式化定義。作者先定義宿舍分配場景和偏好項目，再由 AI 協助將評分規則結構化，作者進行校對與調整。')
    doc.add_page_break()

    # === 二、演算法 ===
    h1(doc, '二、提出的演算法')

    h2(doc, '2-1 床位展開策略')
    p(doc, '由於系統支援多人房，核心策略是將多人房展開為個別床位槽（Bed Slot），將多對一問題轉換為一對一指派問題：')
    p(doc, '• 一間雙人房展開為 2 個床位槽')
    p(doc, '• 一間三人房展開為 3 個床位槽')
    p(doc, '• 一間四人房展開為 4 個床位槽')
    p(doc, '同一房間內的所有床位槽共享相同的房間屬性，因此對同一位學生而言，同一房間的各床位具有相同的偏好分數。展開後，問題即為標準的一對一指派問題，可直接套用課堂所學的演算法求解。')

    h2(doc, '2-2 分支定界法 (Branch-and-Bound)')
    p(doc, '核心演算法，對應課堂的「人員指派問題」。')
    p(doc, '1. 以 DFS 逐一決定每位學生分配到哪個床位槽。')
    p(doc, '2. 上界函數：對尚未分配的每位學生，取其在剩餘床位中的最大偏好分數之和。')
    p(doc, '3. 修剪條件：當前分數 + 上界 ≤ 已知最佳解時修剪。')
    p(doc, '時間複雜度：最壞 O(n!)，修剪後遠小。空間複雜度：O(n)。')

    h2(doc, '2-3 貪婪演算法 (Greedy)')
    p(doc, '將所有 (學生, 床位) 的偏好分數由大到小排序，依序選取最高分且雙方都未被配對的組合。')
    p(doc, '時間複雜度：O(n²·log n)。特點：速度快但不保證最優解。')

    h2(doc, '2-4 動態規劃法 (DP, Bitmask)')
    p(doc, '用位元遮罩表示已佔用的床位集合，填表求解。')
    p(doc, 'dp[mask] = 前 popcount(mask) 位學生分配完畢時的最大總分。')
    p(doc, '時間複雜度：O(totalBeds × 2^totalBeds)。限制：totalBeds ≤ 20。')

    h2(doc, '2-5 演算假設')
    p(doc, '• 偏好分數由系統根據學生偏好與房間屬性自動計算，不需人工填寫。')
    p(doc, '• 配對為一對一（學生 ↔ 床位槽），同一房間的不同床位對同一學生分數相同。')

    h2(doc, '2-6 替代方法分析')
    add_table(doc,
        ['方法', '核心概念', '評估'],
        [['分支定界法\n（本系統採用）','DFS + 上界修剪','保證最優解\n適合床位數 ≤ 15'],
         ['貪婪演算法\n（本系統採用）','每次選最高分且可用的配對','速度極快\n不保證最優'],
         ['動態規劃法\n（本系統採用）','位元遮罩狀態壓縮','保證最優，時間穩定\n空間 O(2^m)，m≤20']], '表 5  三種演算法比較')

    h2(doc, '2-7 AI 工具協助項目')
    p(doc, '在設計演算法時，使用 AI 輔助工具協助整理床位展開策略與演算法步驟的中文描述，作者進行校對與調整。')
    doc.add_page_break()

    # === 三、實作與結果 ===
    h1(doc, '三、實作與結果')

    h2(doc, '3-1 程式實作概述')
    p(doc, '系統使用純前端技術（HTML5 + CSS + JavaScript）實作。房間設定、學生偏好設定、偏好分數自動計算、三種演算法、二部圖視覺化等功能全部在 app.js 中實作。使用者在瀏覽器開啟 index.html 即可使用，系統已部署至 GitHub Pages。')

    h2(doc, '3-2 主要資料結構')
    p(doc, '• rooms[]：房間物件陣列，每個元素包含 number, type, floor, ac, bath, orient。')
    p(doc, '• students[]：學生物件陣列，每個元素包含 name, prefType, prefFloor, prefAC, prefBath, prefOrient。')
    p(doc, '• bedSlots[]：床位槽陣列，由 rooms 展開而來。每個床位槽繼承其所屬房間的全部屬性。')
    p(doc, '• scoreMatrix[][]：n×totalBeds 偏好分數矩陣，scoreMatrix[i][j] 為學生 i 對床位槽 j 的分數。')
    p(doc, '• assignment[]：配對結果，assignment[i] = j 表示學生 i 被分配到床位槽 j。')

    h2(doc, '3-3 核心搜尋函式')
    p(doc, '分支定界法核心函式（solveBnB）：')
    p(doc, 'function solveBnB() {')
    p(doc, '    const sz = Math.min(n, totalBeds);')
    p(doc, '    let bestScore = -1, bestAssign = null;')
    p(doc, '    function upperBound(person, usedSlots) {')
    p(doc, '        let ub = 0;')
    p(doc, '        for (let p = person; p < sz; p++) {')
    p(doc, '            let mx = 0;')
    p(doc, '            for (let j = 0; j < totalBeds; j++)')
    p(doc, '                if (!usedSlots.has(j)) mx = Math.max(mx, scoreMatrix[p][j]);')
    p(doc, '            ub += mx;')
    p(doc, '        }')
    p(doc, '        return ub;')
    p(doc, '    }')
    p(doc, '    function search(person, curScore, assignment, usedSlots) {')
    p(doc, '        if (person === sz) { 更新最佳解; return; }')
    p(doc, '        if (curScore + upperBound(person, usedSlots) <= bestScore) { 修剪; return; }')
    p(doc, '        for (每個未佔用的床位 j) {')
    p(doc, '            assignment[person] = j; usedSlots.add(j);')
    p(doc, '            search(person+1, curScore+scoreMatrix[person][j], ...);')
    p(doc, '            usedSlots.delete(j); // 回溯')
    p(doc, '        }')
    p(doc, '    }')
    p(doc, '}')

    h2(doc, '3-4 測試案例與輸出結果')
    h3(doc, '測試案例 1')
    p(doc, '4 間房（2×雙人 + 1×三人 + 1×四人 = 11 床位），11 位學生。')
    p(doc, '每位學生的偏好條件不同（偏好房型、樓層、設備需求各異），系統自動計算 11×11 的偏好分數矩陣。三種演算法的配對結果如下（實際數值依學生偏好設定而異，以系統輸出為準）：')
    add_table(doc,
        ['演算法', '總偏好分數', '搜尋節點數', '修剪次數', '時間(ms)'],
        [['分支定界法', '（系統輸出）', '-', '-', '-'],
         ['貪婪演算法', '（系統輸出）', '-', '0', '-'],
         ['動態規劃法', '（系統輸出）', '-', '0', '-']], '表 6  測試案例 1 結果')

    h3(doc, '測試案例 2')
    p(doc, '3 間房（2×雙人 + 1×三人 = 7 床位），7 位學生。')
    add_table(doc,
        ['演算法', '總偏好分數', '搜尋節點數', '修剪次數', '時間(ms)'],
        [['分支定界法', '（系統輸出）', '-', '-', '-'],
         ['貪婪演算法', '（系統輸出）', '-', '0', '-'],
         ['動態規劃法', '（系統輸出）', '-', '0', '-']], '表 7  測試案例 2 結果')

    h2(doc, '3-5 案例手算驗證')
    p(doc, '以一個簡化的 3 學生 × 3 床位案例進行分支定界法手算驗證：')
    p(doc, '假設偏好分數矩陣為：A=[90, 60, 40], B=[50, 85, 70], C=[55, 45, 95]')
    p(doc, '')
    p(doc, '搜尋過程：')
    p(doc, '├─ A→床位1 (90)，進入第 2 層')
    p(doc, '│  ├─ B→床位2 (85)，累計 175')
    p(doc, '│  │  └─ C→床位3 (95)，累計 270 → bestScore=270 ✓')
    p(doc, '│  └─ B→床位3 (70)，累計 160')
    p(doc, '│     └─ C→床位2 (45)，累計 205 < 270，非最優')
    p(doc, '├─ A→床位2 (60)，UB=60+70+95=225 < 270 → 修剪 ✂️')
    p(doc, '└─ A→床位3 (40)，UB=40+85+55=180 < 270 → 修剪 ✂️')
    p(doc, '')
    p(doc, '最佳解：270（A→床位1, B→床位2, C→床位3），搜尋 5 節點，修剪 2 次。')

    h2(doc, '3-6 三組測試結果比較')
    add_table(doc,
        ['項目', '分支定界法', '貪婪演算法', '動態規劃法'],
        [['保證最優', '✅ 是', '❌ 否', '✅ 是'],
         ['時間複雜度', 'O(n!), 修剪後遠小', 'O(n² log n)', 'O(m × 2ᵐ)'],
         ['空間複雜度', 'O(n)', 'O(n²)', 'O(2ᵐ)'],
         ['可處理規模', 'n ≤ 15', '無上限', 'm ≤ 20'],
         ['課堂對應', '分支定界+人員指派', '貪婪演算法', '動態規劃']], '表 8  三種演算法綜合比較')

    h2(doc, '3-7 AI 工具協助項目')
    p(doc, '1. 程式碼框架生成：作者提供演算法虛擬碼和偏好分數計算規則，由 AI 協助轉為 JavaScript 實作，作者手動驗證。')
    p(doc, '2. Canvas 視覺化：AI 協助實作二部圖的繪製邏輯（學生圓形→房間矩形，含容量顯示）。')
    p(doc, '3. 表單互動：AI 協助實作房間屬性編輯和學生偏好下拉選單的動態生成與資料綁定。')
    doc.add_page_break()

    # === 四、討論 ===
    h1(doc, '四、討論')

    h2(doc, '4-1 系統優點')
    p(doc, '• 貼近真實場景：支援雙人房/三人房/四人房的混合配置，學生可設定多維度偏好，比簡單的分數矩陣更接近實際宿舍分配。')
    p(doc, '• 自動評分：偏好分數由系統根據規則自動計算，免去人工填寫大量數字的麻煩。')
    p(doc, '• 多演算法比較：三種演算法一鍵比較，直觀展示精確度與速度的取捨。')
    p(doc, '• 穩定性檢測：自動偵測 blocking pair，評估分配公平性。')
    p(doc, '• 零安裝：純前端應用，只需瀏覽器即可使用。')

    h2(doc, '4-2 系統限制')
    p(doc, '• 規模限制：B&B 在總床位 > 15 時計算時間急增，DP 在 > 20 時記憶體不足。')
    p(doc, '• 單人一床位：系統為一對一配對，不支援學生共用同一床位。')
    p(doc, '• 偏好權重固定：五個偏好項目的權重（35/25/15/15/10）為預設值，未開放使用者調整。')
    p(doc, '• 資料不持久化：重新載入頁面後資料消失。')

    h2(doc, '4-3 結論與反思')
    h3(doc, '4-3.1 系統成果')
    p(doc, '本系統成功實作了一套支援多房型的學生宿舍最佳配對系統。透過床位展開策略，將多人房的多對一問題轉換為一對一指派問題，使課堂所學的分支定界法、貪婪法和動態規劃法可以直接套用。系統的偏好分數自動計算功能讓使用者只需設定偏好條件，無需手動填寫分數矩陣。')

    h3(doc, '4-3.2 未來改進方向')
    p(doc, '• 偏好權重自訂：讓使用者調整五個偏好項目的權重比例。')
    p(doc, '• 室友偏好：加入「希望和某位同學同房」的社交偏好。')
    p(doc, '• 資料持久化：支援 JSON 匯出/匯入。')
    p(doc, '• 大規模演算法：引入模擬退火或遺傳演算法處理 > 20 床位的問題。')

    h3(doc, '4-3.3 遇到的挑戰')
    p(doc, '• 床位展開與還原：將多人房展開為個別床位後，演算法產出的結果需要還原回「哪些學生住哪間房」的格式。同一房間的多個床位對同一學生分數相同，需確保結果的正確分組顯示。')
    p(doc, '• 偏好分數設計：五個評分項目的權重分配需要平衡——房型偏好佔比最高（35分），因為住雙人房和四人房的體驗差異最大；朝向偏好佔比最低（10分），因為影響相對較小。')
    p(doc, '• 上界函數：由於同一房間的多個床位分數相同，上界函數可能重複計算同一房間的分數。目前採用的上界仍為合法上界，但不夠緊緻，未來可改進。')

    add_page_number(doc)
    output_path = os.path.join(os.path.dirname(__file__), 'Program_Assignment_3_Report.docx')
    doc.save(output_path)
    print(f'[OK] Report saved: {output_path}')

if __name__ == '__main__':
    create_report()
