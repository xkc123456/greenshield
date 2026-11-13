(function () {
  "use strict";

  const dataProvider = window.GreenCreditData;
  const engine = window.Indicators;
  const insightsData = window.GreenCreditInsights || null;
  const root = document.getElementById("view-cases");

  if (!dataProvider || !engine || !root) {
    document.body.innerHTML = "<main><div class=\"card\"><div class=\"card-body\">应用模块加载失败，请确认 dataProvider.js、indicators.js、app.js 与 index.html 位于同一目录。</div></div></main>";
    return;
  }

  const state = {
    currentView: "cases",
    selectedId: null,
    rawData: null,
    result: null,
    reportTime: null,
    customTemplate: dataProvider.createBlankCustomTemplate(),
    reviews: {},
    trail: [],
    toastTimer: null
  };

  const views = {
    cases: document.getElementById("view-cases"),
    workspace: document.getElementById("view-workspace"),
    issues: document.getElementById("view-issues"),
    report: document.getElementById("view-report"),
    insights: document.getElementById("view-insights")
  };

  // 「行业洞察」是背景信息，不属于四步核查流程，未选企业时也可访问。
  const FREE_VIEWS = new Set(["cases", "insights"]);

  const navButtons = Array.from(document.querySelectorAll("[data-view]"));
  const caseGrid = document.getElementById("case-grid");
  const customPanel = document.getElementById("custom-panel");
  const customForm = document.getElementById("custom-form");
  const closeCustomButton = document.getElementById("close-custom");
  const workbenchLeft = document.getElementById("workbench-left");
  const workbenchCenter = document.getElementById("workbench-center");
  const workbenchRight = document.getElementById("workbench-right");
  const issuesContent = document.getElementById("issues-content");
  const issuesSummary = document.getElementById("issues-summary");
  const reportSheet = document.getElementById("report-sheet");
  const printButton = document.getElementById("print-report");
  const toast = document.getElementById("toast");

  const REVIEW_OPTIONS = [
    ["pending", "待复核"],
    ["confirmed", "已核实"],
    ["dismissed", "已排除"]
  ];

  const VETO_ADVICE = {
    R1: "停止绿色认定流程，要求补充合法有效的环评批复及项目一致性证明。",
    R2: "重新开展绿色属性认定，排除以普通技改包装绿色项目的可能。",
    R3: "暂停绿色授信审批，核验项目真实性、建设计划与资金用途。",
    R4: "取得诉讼材料、律师意见及预计负债评估后，由风险委员会决定是否继续。",
    R5: "立即暂停绿色认定，核查执行案件、履行能力与信用修复情况。"
  };

  const DIMENSION_COLORS = {
    A: "#0d8a66",
    B: "#c08a2e",
    C: "#2f6fb0",
    D: "#7a5ea8",
    E: "#4a6572"
  };

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fixed(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    const factor = 10 ** (digits === undefined ? 2 : digits);
    return (Math.round((number + Number.EPSILON) * factor) / factor).toLocaleString("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits === undefined ? 2 : digits
    });
  }

  function formatPercent(value, digits) {
    return `${fixed(Number(value) * 100, digits === undefined ? 1 : digits)}%`;
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || value === "") return "未填写";
    const number = Number(value);
    if (!Number.isFinite(number)) return "未填写";
    if (Math.abs(number) >= 10000) return `${fixed(number / 10000, 2)} 亿元`;
    if (Math.abs(number) < 1) return `${fixed(number, 2)} 万元`;
    return `${fixed(number, 0)} 万元`;
  }

  function formatDateTime(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatDate(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // 每个指标的展示口径，与公式单位保持一致，避免“比率当百分比”“倍数当百分比”。
  const VALUE_FORMATTERS = {
    A1: (m) => formatPercent(m.value),
    A2: (m) => formatPercent(m.value),
    A3: (m) => formatPercent(m.value),
    A4: (m) => formatPercent(m.value),
    A5: (m) => formatPercent(m.value, 0),
    A6: (m) => `${fixed(m.value, 0)} 次`,
    A7: (m) => formatPercent(m.value, 0),
    A8: (m) => formatPercent(m.value, 0),
    B1: (m) => `${fixed(m.value, 0)} 次`,
    B2: (m) => ({ 1: "A级", 0.7: "B级", 0.35: "C级", 0: "D级/未提供" }[m.value] || "未提供"),
    B3: (m) => (m.value >= 1 ? "三项一致" : m.value >= 0.5 ? "存在不一致" : "缺失/失效"),
    B4: (m) => `${fixed(m.value, 0)} 条`,
    C1: (m) => `${fixed(m.value * 100, 1)} 个百分点`,
    C2: (m) => `${fixed(m.value, 2)} 倍`,
    C3: (m) => formatPercent(m.value),
    C4: (m) => `${fixed(m.value, 2)} 倍`,
    C5: (m) => `${fixed(m.value * 100, 1)} 个百分点`,
    C6: (m) => formatPercent(m.value),
    C7: (m) => formatPercent(m.value),
    D1: (m) => `${fixed(m.value, 0)} 起`,
    D2: (m) => `${fixed(m.value, 0)} 个月`,
    D3: (m) => `${fixed(m.value, 0)} 次`,
    D4: (m) => (m.value ? "命中" : "未命中"),
    E1: (m) => formatPercent(m.value),
    E2: (m) => formatPercent(m.value),
    E3: (m) => `${fixed(m.value, 0)} 次`,
    E4: (m) => ({ 1: "标准无保留", 0.75: "带强调事项", 0.4: "保留意见", 0: "否定/无法表示" }[m.value] || "其他"),
    E5: (m) => `${fixed(m.value, 0)} 次`
  };

  function formatMetricValue(metric) {
    const formatter = VALUE_FORMATTERS[metric.id];
    return formatter ? formatter(metric) : fixed(metric.value, 2);
  }

  function formatScore(metric) {
    const diff = Math.abs(Number(metric.score) - Number(metric.weight));
    const cls = diff < 0.001 ? "score-full" : Number(metric.score) === 0 ? "score-zero" : "score-partial";
    return `<span class="metric-score ${cls}">${fixed(metric.score, 1)}/${metric.weight}</span>`;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function pushTrail(action) {
    const last = state.trail[state.trail.length - 1];
    if (last && last.action === action) return;
    state.trail.push({ time: new Date(), action });
  }

  function themeVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("lxd-theme", theme);
    } catch (error) {
      /* file:// 下可能不可用，忽略 */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1411" : "#0d6048");
    if (state.result) {
      if (!views.workspace.hidden) drawGauge(state.result);
      if (!views.report.hidden) drawRadar(state.result);
    }
  }

  function getValueByPath(object, path) {
    return path.replace(/\[(\d+)\]/g, ".$1").split(".").reduce((current, key) => (current === undefined || current === null ? undefined : current[key]), object);
  }

  function setValueByPath(object, path, value) {
    const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    let current = object;
    keys.slice(0, -1).forEach((key) => {
      if (current[key] === undefined) current[key] = /^\d+$/.test(key) ? [] : {};
      current = current[key];
    });
    current[keys[keys.length - 1]] = value;
  }

  function getAllIssues(result) {
    const vetoIssues = result.veto.rules.map((rule) => ({
      metricId: rule.id,
      title: rule.name,
      conflict: rule.description,
      advice: VETO_ADVICE[rule.id] || "暂停绿色认定并进行人工复核。",
      severity: "critical",
      missing: false,
      veto: true
    }));
    return vetoIssues.concat(result.issues.map((issue) => ({ ...issue, veto: false })));
  }

  function gradeColor(result) {
    if (result.veto.triggered) return "#c7000b";
    if (result.grade.code === "pass") return "#167447";
    if (result.grade.code === "conditional") return "#9a5b00";
    if (result.grade.code === "prudent") return "#b42318";
    return "#c7000b";
  }

  function severityLabel(issue) {
    if (issue.veto) return "否决";
    if (issue.severity === "critical") return "高";
    if (issue.severity === "medium") return "中";
    return "低";
  }

  /* ---------------- 案例选择 ---------------- */

  function renderCases() {
    const catalog = dataProvider.getEnterpriseCatalog();
    const cards = catalog.map((company, index) => `
      <button class="case-card" type="button" data-case-id="${escapeHtml(company.id)}">
        <div class="case-head">
          <div class="case-identity">
            <div class="case-badge">${escapeHtml(company.shortName.slice(0, 1))}</div>
            <div>
              <span class="case-name">${escapeHtml(company.shortName)}</span>
              <div class="case-industry">${escapeHtml(company.industry)}</div>
            </div>
          </div>
          <span class="case-type">案例 ${String(index + 1).padStart(2, "0")}</span>
        </div>
        <div class="case-project">${escapeHtml(company.projectName)}</div>
        <div class="case-desc">${escapeHtml(company.projectOverview)}</div>
        <div class="case-foot">
          <span>${escapeHtml(company.region)}</span>
          <strong>进入核查</strong>
        </div>
      </button>
    `).join("");

    caseGrid.innerHTML = cards + `
      <button class="case-card custom" type="button" data-open-custom>
        <span class="case-badge" aria-hidden="true">+</span>
        <span class="custom-copy">
          <span class="custom-title">自定义企业<span class="case-type">全字段</span></span>
          <span class="custom-desc">录入企业、用电量、投资、报表科目、处罚及征信原始字段，提交后执行与内置案例完全相同的 28 项计算、分档打分与一票否决规则。</span>
        </span>
        <span class="custom-meta">24 个月用电量</span>
        <span class="custom-cta">开始录入 <span aria-hidden="true">→</span></span>
      </button>
    `;
  }

  function setNavAvailability() {
    navButtons.forEach((button) => {
      button.disabled = !FREE_VIEWS.has(button.dataset.view) && !state.selectedId;
    });
  }

  function switchView(name) {
    if (!FREE_VIEWS.has(name) && !state.selectedId) {
      showToast("请先选择或录入一家核查企业");
      return;
    }
    state.currentView = name;
    Object.entries(views).forEach(([key, element]) => {
      element.hidden = key !== name;
    });
    navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    if (name === "workspace") renderWorkspace();
    if (name === "issues") renderIssues();
    if (name === "insights") renderInsights();
    if (name === "report") {
      renderReport();
      if (state.selectedId) pushTrail("查看核查报告");
    }
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function selectEnterprise(id) {
    const rawData = dataProvider.getEnterpriseRawData(id);
    if (!rawData) {
      showToast("未找到该企业原始数据");
      return;
    }
    state.selectedId = id;
    state.rawData = rawData;
    state.result = engine.evaluateEnterprise(rawData);
    state.reportTime = new Date();
    state.reviews = {};
    state.trail = [];
    customPanel.hidden = true;
    setNavAvailability();
    renderWorkspace();
    renderIssues();
    renderReport();
    switchView("workspace");
    pushTrail(`载入案例：${rawData.shortName || rawData.name}`);
    showToast(`已载入 ${rawData.shortName || rawData.name}`);
  }

  /* ---------------- 工作台 ---------------- */

  function renderClaimCards(raw) {
    const show = (value, formatter) => (value === null || value === undefined || value === "" ? "未填写" : formatter(value));
    const claims = [
      ["宣称减排", show(raw.claims.emissionReductionRate, (value) => `${fixed(value, 1)}%`)],
      ["申报投资", show(raw.claims.investmentAmount, formatCurrency)],
      ["产值增速", show(raw.claims.productionGrowthRate, (value) => `${fixed(value, 1)}%`)],
      ["计划进度", show(raw.claims.plannedProgress, (value) => `${fixed(value, 1)}%`)],
      ["绿电占比", `${show(raw.claims.greenPowerRatioPrior, (value) => `${fixed(value, 1)}%`)} → ${show(raw.claims.greenPowerRatioCurrent, (value) => `${fixed(value, 1)}%`)}`],
      ["计划贷款", show(raw.claims.projectLoanAmount, formatCurrency)]
    ];
    return `<div class="claim-grid">${claims.map(([label, value]) => `<div class="claim-tile"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>`;
  }

  const EVIDENCE_ROWS = [
    ["环评批复", (raw) => (raw.project.eiaApproved ? raw.project.eiaApprovalNo || "已提供" : "未提供"), "申报材料"],
    ["排污许可", (raw) => (raw.project.wastePermitHas && raw.project.wastePermitValid ? "有效" : "缺失/失效"), "环保公开"],
    ["项目资产增量", (raw) => formatCurrency(raw.project.assetIncreaseProject), "财务报表"],
    ["项目已付现金", (raw) => formatCurrency(raw.project.projectPaidCash), "行内流水"],
    ["购建固定资产现金", (raw) => formatCurrency(raw.finance.cashPaidForFixedAssets), "财务报表"],
    ["资产负债率", (raw) => (raw.finance.totalAssets === null || raw.finance.totalAssets === undefined ? "未填写" : formatPercent(raw.finance.totalLiabilities / Math.max(raw.finance.totalAssets, 1))), "财务报表"],
    ["近36个月处罚", (raw) => (raw.compliance.envPenaltyCount36m === null || raw.compliance.envPenaltyCount36m === undefined ? "未填写" : `${fixed(raw.compliance.envPenaltyCount36m, 0)} 次`), "环保公开"],
    ["环保诉讼", (raw) => ({ none: "无", resolvedMinor: "已了结", pendingMinor: "未决一般", pendingMajor: "未决重大" }[raw.compliance.envLitigationStatus] || "未提供"), "司法公开"],
    ["股权质押率", (raw) => (raw.governance.pledgeRatio === null || raw.governance.pledgeRatio === undefined ? "未填写" : `${fixed(raw.governance.pledgeRatio, 1)}%`), "行内征信"],
    ["实控人失信", (raw) => (raw.governance.controllerDishonesty ? "命中" : "未命中"), "行内征信"]
  ];

  function renderRawEvidence(raw) {
    return `<div class="raw-list">${EVIDENCE_ROWS.map(([label, reader, source]) => `
      <div class="raw-item">
        <span>${escapeHtml(label)}</span>
        <div class="raw-value">
          <strong>${escapeHtml(reader(raw))}</strong>
          <em class="source-tag">${escapeHtml(source)}</em>
        </div>
      </div>
    `).join("")}</div>`;
  }

  function buildElectricitySvg(raw) {
    const prior = (raw.operation.electricityPrior || []).map(Number);
    const current = (raw.operation.electricityCurrent || []).map(Number);
    const all = prior.concat(current);
    if (!all.some((value) => Number.isFinite(value) && value > 0)) {
      return `<div class="empty-mini">未录入用电量数据，A 维度相关指标已按中性分计。</div>`;
    }
    const width = 320;
    const height = 172;
    const padL = 34;
    const padR = 14;
    const padT = 20;
    const padB = 26;
    const min = Math.min(...all);
    const max = Math.max(...all);
    const range = Math.max(max - min, 1);
    const xAt = (index) => padL + index * (width - padL - padR) / 11;
    const yAt = (value) => height - padB - ((value - min) / range) * (height - padT - padB);
    const pointsOf = (series) => series.map((value, index) => `${fixed(xAt(index), 1)},${fixed(yAt(value), 1)}`).join(" ");
    const priorPoints = pointsOf(prior);
    const currentPoints = pointsOf(current);
    const areaPath = `M ${fixed(xAt(0), 1)} ${fixed(yAt(current[0] || 0), 1)} ` +
      current.map((value, index) => `L ${fixed(xAt(index), 1)} ${fixed(yAt(value), 1)}`).join(" ") +
      ` L ${fixed(xAt(current.length - 1), 1)} ${height - padB} L ${padL} ${height - padB} Z`;
    const priorSum = prior.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
    const currentSum = current.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
    const delta = priorSum ? (currentSum - priorSum) / priorSum : 0;
    const deltaTone = delta <= 0 ? "#0d6048" : "#c0392b";
    const gridLines = [0, 0.5, 1].map((level) => {
      const y = fixed(height - padB - level * (height - padT - padB), 1);
      return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#e8efeb" stroke-dasharray="3 4"/>`;
    }).join("");
    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="24个月用电量趋势">
        <defs>
          <linearGradient id="elecArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#12a074" stop-opacity="0.26"/>
            <stop offset="100%" stop-color="#12a074" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${gridLines}
        <path d="${areaPath}" fill="url(#elecArea)"/>
        <polyline points="${priorPoints}" fill="none" stroke="#9aa8a1" stroke-width="1.8" stroke-dasharray="4 4" stroke-linejoin="round"/>
        <polyline points="${currentPoints}" fill="none" stroke="#0d8a66" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${fixed(xAt(11), 1)}" cy="${fixed(yAt(current[11] || 0), 1)}" r="3.2" fill="#fff" stroke="#0d8a66" stroke-width="2"/>
        <text x="${padL}" y="13" font-size="9.5" fill="#84948c">最高 ${fixed(max, 0)} MWh</text>
        <text x="${width - padR}" y="${height - 8}" font-size="9.5" text-anchor="end" fill="${deltaTone}">合计同比 ${formatPercent(delta)}</text>
      </svg>
    `;
  }

  function renderWorkspace() {
    if (!state.rawData || !state.result) return;
    const raw = state.rawData;
    const result = state.result;
    const issues = getAllIssues(result);
    const confidence = result.confidence;
    const kicker = [raw.industry, raw.reportCode].filter(Boolean).join(" · ");
    const catalogLine = [raw.claims.catalogCode, raw.claims.projectCategory].filter(Boolean).join(" · ") || "未填写";

    workbenchLeft.innerHTML = `
      <section class="card company-summary">
        <div class="company-head">
          <div class="company-avatar">${escapeHtml((raw.shortName || raw.name).slice(0, 1))}</div>
          <div class="company-copy">
            <div class="company-kicker">${escapeHtml(kicker)}</div>
            <h3>${escapeHtml(raw.name)}</h3>
            <div class="company-project">${escapeHtml(raw.projectName)}</div>
          </div>
        </div>
        <div class="company-tags">
          <span class="tag">${escapeHtml(raw.region)}</span>
          <span class="tag">${escapeHtml(engine.LOAN_TYPES[raw.claims.loanType] || "项目类贷款")}</span>
          <span class="tag">${escapeHtml(raw.claims.catalogCode || "未填目录代码")}</span>
        </div>
        <div class="summary-list">
          <div class="summary-row"><span>统一代码</span><strong>${escapeHtml(raw.creditCode)}</strong></div>
          <div class="summary-row"><span>注册地区</span><strong>${escapeHtml(raw.region)}</strong></div>
          <div class="summary-row"><span>业务品种</span><strong>${escapeHtml(engine.LOAN_TYPES[raw.claims.loanType] || "项目类贷款")}</strong></div>
          <div class="summary-row"><span>项目目录</span><strong>${escapeHtml(catalogLine)}</strong></div>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><div><h3>申报声明</h3><p>大模型抽取的可验证声明</p></div></div>
        <div class="card-body">${renderClaimCards(raw)}</div>
      </section>
      <section class="card">
        <div class="card-head"><div><h3>原始数据凭证</h3><p>五类数据源交叉取数</p></div></div>
        <div class="card-body">${renderRawEvidence(raw)}</div>
      </section>
      <section class="card electricity-card">
        <div class="card-head">
          <div><h3>24个月用电量</h3><p>单位 MWh</p></div>
          <div class="chart-legend"><span><i></i>本年</span><span class="prior"><i></i>上年</span></div>
        </div>
        <div class="card-body">${buildElectricitySvg(raw)}</div>
      </section>
    `;

    workbenchCenter.innerHTML = Object.values(engine.DIMENSIONS).map((dimension) => {
      const dimensionMetrics = result.metrics.filter((metric) => metric.dimension === dimension.key);
      const dimensionResult = result.dimensions.find((item) => item.key === dimension.key);
      const rows = dimensionMetrics.map((metric) => `
        <details class="metric-row${metric.missing ? " is-missing" : ""}">
          <summary>
            <span class="metric-code">${escapeHtml(metric.id)}</span>
            <span class="metric-name">${escapeHtml(metric.name)}${metric.missing ? '<em class="missing-badge">数据缺失</em>' : ""}</span>
            <span class="metric-value">${escapeHtml(formatMetricValue(metric))}</span>
            ${formatScore(metric)}
          </summary>
          <div class="metric-detail">
            <div class="detail-grid">
              <div><span>数据来源</span><strong>${escapeHtml(metric.source)}</strong></div>
              <div><span>取数口径</span><strong>${escapeHtml(metric.rawSnapshot)}</strong></div>
              <div><span>公式</span><strong>${escapeHtml(metric.formula)}</strong></div>
              <div><span>计算过程</span><strong>${escapeHtml(metric.calculation)}</strong></div>
            </div>
            <div class="tier-text">分档规则：${escapeHtml(metric.scoring)}　|　得分：${fixed(metric.score, 1)} / ${metric.weight}${metric.missing ? "（数据缺失，按中性分计）" : ""}</div>
            <div class="formula">核查建议：${escapeHtml(metric.advice)}</div>
          </div>
        </details>
      `).join("");
      return `
        <section class="card metric-group">
          <div class="metric-group-title">
            <div><span class="dimension-code" style="background:${DIMENSION_COLORS[dimension.key]}">${escapeHtml(dimension.key)}</span><strong>${escapeHtml(dimension.name)}</strong></div>
            <strong>${fixed(dimensionResult.score, 1)} / ${dimension.weight}</strong>
          </div>
          ${rows}
        </section>
      `;
    }).join("");

    workbenchRight.innerHTML = `
      <section class="card score-panel">
        <div class="card-head">
          <div><h3>综合得分</h3><p>${result.veto.triggered ? "一票否决已触发" : "未触发一票否决"}</p></div>
          <span class="score-badge">100 分制</span>
        </div>
        <div class="score-body">
          <div class="gauge-wrap"><canvas id="score-gauge" width="480" height="284" aria-label="总分仪表盘"></canvas></div>
          <div class="grade-label">
            <strong style="color:${gradeColor(result)}">${escapeHtml(result.grade.label)}</strong>
            <span>${result.totalScore} 分 · ${escapeHtml(result.grade.risk)}</span>
          </div>
          <div class="confidence-line">
            <span class="confidence-tag confidence-${confidence.code}">数据${escapeHtml(confidence.level)}</span>
            <span class="muted">${escapeHtml(confidence.notes[0] || "")}</span>
          </div>
          <div class="dimension-bars">
            ${result.dimensions.map((dimension) => `
              <div>
                <div class="dimension-bar-head"><span>${escapeHtml(dimension.key)} ${escapeHtml(dimension.name)}</span><strong>${fixed(dimension.score, 1)}/${dimension.weight}</strong></div>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.min(dimension.ratio * 100, 100)}%;background:${DIMENSION_COLORS[dimension.key]}"></div></div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><div><h3>疑点摘要</h3><p>共 ${issues.length} 项</p></div><button class="btn btn-small" type="button" data-go="issues">全部</button></div>
        <div class="card-body">
          ${issues.length ? `<div class="quick-issues">${issues.slice(0, 4).map((issue) => `<div class="quick-issue"><strong>${escapeHtml(issue.metricId)} · ${escapeHtml(issue.title)}</strong><span>${escapeHtml(issue.conflict)}</span></div>`).join("")}</div>` : `<div class="empty-mini">未发现实质性疑点</div>`}
        </div>
      </section>
    `;

    requestAnimationFrame(() => drawGauge(result));
  }

  function resizeCanvas(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const height = Math.max(rect.height, 132);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, width, height };
  }

  function gaugePalette(result) {
    if (result.veto.triggered || result.grade.code === "reject") return ["#ef8072", "#b42318"];
    if (result.grade.code === "pass") return ["#5fd3a8", "#0d6048"];
    if (result.grade.code === "conditional") return ["#f2c878", "#a85b0a"];
    return ["#f0a08c", "#b42318"];
  }

  function drawGauge(result) {
    const canvas = document.getElementById("score-gauge");
    if (!canvas || !canvas.offsetParent) return;
    const { context, width, height } = resizeCanvas(canvas);
    if (width < 80) return;
    const centerX = width / 2;
    const centerY = height * 0.88;
    const radius = Math.min(width * 0.36, height * 0.62);
    const ratio = Math.max(0, Math.min(1, result.totalScore / 100));
    const start = Math.PI;
    const lineWidth = Math.max(9, Math.min(16, width * 0.062));
    const [light, strong] = gaugePalette(result);

    context.clearRect(0, 0, width, height);

    context.lineCap = "round";
    context.lineWidth = lineWidth;
    context.strokeStyle = themeVar("--chart-track", "#eaf0ec");
    context.beginPath();
    context.arc(centerX, centerY, radius, start, Math.PI * 2);
    context.stroke();

    if (ratio > 0.001) {
      const gradient = context.createLinearGradient(centerX - radius, 0, centerX + radius, 0);
      gradient.addColorStop(0, light);
      gradient.addColorStop(1, strong);
      context.strokeStyle = gradient;
      context.beginPath();
      context.arc(centerX, centerY, radius, start, start + Math.PI * ratio);
      context.stroke();
    }

    // 等级阈值刻度：55 / 70 / 85
    context.lineCap = "round";
    context.lineWidth = 2;
    [55, 70, 85].forEach((threshold) => {
      const angle = start + Math.PI * (threshold / 100);
      context.strokeStyle = themeVar("--paper", "#ffffff");
      context.beginPath();
      context.moveTo(centerX + Math.cos(angle) * (radius - lineWidth / 2 - 1), centerY + Math.sin(angle) * (radius - lineWidth / 2 - 1));
      context.lineTo(centerX + Math.cos(angle) * (radius + lineWidth / 2 + 1), centerY + Math.sin(angle) * (radius + lineWidth / 2 + 1));
      context.stroke();
    });

    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    context.fillStyle = themeVar("--ink", "#0e1b16");
    const numberSize = Math.round(Math.min(width * 0.17, 40));
    context.font = `800 ${numberSize}px "Inter", "Microsoft YaHei", sans-serif`;
    context.fillText(String(result.totalScore), centerX, centerY - 24);
    context.fillStyle = themeVar("--muted-2", "#84948c");
    context.font = `500 ${Math.round(Math.min(width * 0.052, 12))}px "Inter", "Microsoft YaHei", sans-serif`;
    context.fillText("总分 / 100", centerX, centerY + 2);
  }

  /* ---------------- 疑点清单 + 人工复核 ---------------- */

  function reviewOf(metricId) {
    return state.reviews[metricId] || { status: "pending", note: "" };
  }

  function reviewSelect(metricId) {
    const current = reviewOf(metricId);
    return `<select class="review-select" data-review="${escapeHtml(metricId)}" aria-label="复核结论">
      ${REVIEW_OPTIONS.map(([value, label]) => `<option value="${value}"${current.status === value ? " selected" : ""}>${label}</option>`).join("")}
    </select>`;
  }

  function renderIssues() {
    if (!state.result) return;
    const issues = getAllIssues(state.result);
    const confidence = state.result.confidence;
    issuesSummary.textContent = `${state.rawData.shortName || state.rawData.name} · ${state.result.grade.label} · ${issues.length}项疑点 · 数据${confidence.level}`;
    if (!issues.length) {
      issuesContent.innerHTML = `<div class="empty-state">未发现实质性疑点，28项指标计算与原始凭证总体一致。</div>`;
      return;
    }
    issuesContent.innerHTML = `
      <div class="table-scroll">
        <table>
          <thead><tr><th class="issue-rank">序号</th><th class="issue-title">疑点描述</th><th class="issue-data">矛盾数据</th><th class="issue-advice">核查建议</th><th class="issue-review">人工复核</th></tr></thead>
          <tbody>
            ${issues.map((issue, index) => `
              <tr class="${issue.veto ? "is-veto" : ""}">
                <td class="issue-rank">${String(index + 1).padStart(2, "0")}</td>
                <td class="issue-title"><span class="severity severity-${escapeHtml(issue.severity)}">${escapeHtml(severityLabel(issue))}</span><br>${escapeHtml(issue.metricId)} ${escapeHtml(issue.title)}</td>
                <td class="issue-data">${escapeHtml(issue.conflict)}</td>
                <td class="issue-advice">${escapeHtml(issue.advice)}</td>
                <td class="issue-review">
                  ${issue.veto ? '<span class="muted">否决项不可复核</span>' : reviewSelect(issue.metricId)}
                  ${issue.veto ? "" : `<input class="review-note" data-review-note="${escapeHtml(issue.metricId)}" placeholder="复核备注" value="${escapeHtml(reviewOf(issue.metricId).note)}">`}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="review-hint">复核结论仅记录人工判断，不改变系统评分：系统只出疑点，最终认定由银行人员出具。</div>
    `;
  }

  issuesContent.addEventListener("change", (event) => {
    const select = event.target.closest("[data-review]");
    if (select) {
      const id = select.dataset.review;
      state.reviews[id] = { ...reviewOf(id), status: select.value };
      const label = (REVIEW_OPTIONS.find(([value]) => value === select.value) || [])[1] || select.value;
      pushTrail(`人工复核登记：${id} → ${label}`);
      showToast(`已记录 ${id} 复核结论：${label}`);
    }
  });

  issuesContent.addEventListener("input", (event) => {
    const input = event.target.closest("[data-review-note]");
    if (input) {
      const id = input.dataset.reviewNote;
      state.reviews[id] = { ...reviewOf(id), note: input.value };
    }
  });

  /* ---------------- 报告 ---------------- */

  function buildRecommendation(result) {
    const issues = getAllIssues(result);
    if (result.veto.triggered) {
      return "本笔业务已触发一票否决规则，不得进入绿色认定流程。建议暂停受理与放款，完成否决事项整改后按行内制度重新发起审查。";
    }
    if (result.grade.code === "pass") {
      return "绿色属性、资金勾稽与合规治理总体自洽。建议按常规绿色信贷流程办理，并在放款后持续跟踪节能量、绿电消纳凭证与项目资产形成情况。";
    }
    if (result.grade.code === "conditional") {
      return `建议有条件推进。先完成下列${issues.length}项补充核查并落实限制性条款，再提交最终审批：${issues.slice(0, 4).map((issue) => issue.metricId).join("、") || "补充材料"}。`;
    }
    if (result.grade.code === "prudent") {
      return "综合得分处于审慎区间，绿色真实性与项目执行力存在多项实质疑点。建议提交风险管理部门重点核查，暂不适用绿色利率优惠。";
    }
    return "综合评分不足，现有材料无法支持绿色认定，建议退回补充材料或按普通授信标准重新评估。";
  }

  function renderReport() {
    if (!state.rawData || !state.result) return;
    const raw = state.rawData;
    const result = state.result;
    const issues = getAllIssues(result);
    const confidence = result.confidence;
    const date = state.reportTime || new Date();
    const stamp = `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const reportNo = `${raw.reportCode || "LXS-CUSTOM"}-${stamp}-01`;
    const scoringLine = result.veto.triggered
      ? `触发${result.veto.rules.map((rule) => rule.id).join("、")}，总分 ${result.totalScore} 分仅作参考。`
      : result.grade.conclusion;

    const reviewed = issues.filter((issue) => !issue.veto && reviewOf(issue.metricId).status !== "pending");
    const reviewRows = issues.filter((issue) => !issue.veto);

    reportSheet.innerHTML = `
      <div class="report-brandline">
        <span class="mark"><i>绿</i>绿信盾 · 绿色信贷智能认定系统</span>
        <span>内部资料 · 仅供核查使用</span>
      </div>
      <header class="report-cover">
        <div class="report-kicker">Green Credit Due Diligence</div>
        <h1>绿色项目真实性核查报告</h1>
        <div class="report-meta">
          <span>报告编号：${escapeHtml(reportNo)}</span>
          <span>生成时间：${escapeHtml(formatDateTime(date))}</span>
        </div>
      </header>

      <section class="report-section">
        <h2>一、企业及项目概况</h2>
        <p>受核查主体为<strong>${escapeHtml(raw.name)}</strong>，统一社会信用代码 ${escapeHtml(raw.creditCode)}，所属行业为${escapeHtml(raw.industry)}，注册地位于${escapeHtml(raw.region)}。</p>
        <p>本次申报项目为“${escapeHtml(raw.projectName)}”，业务品种为${escapeHtml(engine.LOAN_TYPES[raw.claims.loanType] || "项目类贷款")}，项目分类为${escapeHtml(raw.claims.projectCategory)}（${escapeHtml(raw.claims.catalogCode)}）。${escapeHtml(raw.projectOverview)}</p>
      </section>

      <section class="report-section">
        <h2>二、总分、等级与维度画像</h2>
        <div class="report-facts">
          <div class="report-fact"><span>综合总分</span><strong style="color:${gradeColor(result)}">${result.totalScore} / 100</strong></div>
          <div class="report-fact"><span>核查等级</span><strong class="${result.veto.triggered ? "report-grade-veto" : ""}">${escapeHtml(result.grade.label)}</strong></div>
          <div class="report-fact"><span>疑点 / 数据完整度</span><strong>${issues.length} 项 / ${formatPercent(confidence.coverage, 0)}</strong></div>
        </div>
        <p style="margin-top:12px;">${escapeHtml(scoringLine)}</p>
        <div class="radar-layout">
          <canvas id="report-radar" width="600" height="660" aria-label="五维核查雷达图"></canvas>
          <div class="report-dimension-list">
            ${result.dimensions.map((dimension) => `
              <div class="report-dimension-row">
                <span>${escapeHtml(dimension.key)} ${escapeHtml(dimension.name)}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.min(dimension.ratio * 100, 100)}%;background:${DIMENSION_COLORS[dimension.key]}"></div></div>
                <strong>${fixed(dimension.score, 1)}/${dimension.weight}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="report-section">
        <h2>三、核查结论与建议</h2>
        <div class="report-opinion${result.veto.triggered ? " is-risk" : ""}">${escapeHtml(buildRecommendation(result))}</div>
        <p class="report-note">上述结论由规则引擎依据申报材料与原始凭证自动生成，须经银行有权人员复核后方可作为授信审批参考。</p>
      </section>

      <section class="report-section">
        <h2>四、疑点清单</h2>
        ${issues.length ? `
          <div class="table-scroll">
            <table class="report-issues">
              <thead><tr><th style="width:7%">序号</th><th style="width:19%">疑点描述</th><th style="width:44%">矛盾数据</th><th style="width:30%">核查建议</th></tr></thead>
              <tbody>
                ${issues.map((issue, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td><strong>${escapeHtml(issue.metricId)}</strong> ${escapeHtml(issue.title)}</td>
                    <td>${escapeHtml(issue.conflict)}</td>
                    <td>${escapeHtml(issue.advice)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty-state">未发现实质性疑点。</div>`}
      </section>

      <section class="report-section">
        <h2>五、人工复核记录</h2>
        ${reviewRows.length ? `
          <div class="table-scroll">
            <table class="report-issues">
              <thead><tr><th style="width:8%">序号</th><th style="width:10%">指标</th><th style="width:34%">疑点</th><th style="width:14%">复核结论</th><th style="width:34%">复核备注</th></tr></thead>
              <tbody>
                ${reviewRows.map((issue, index) => {
                  const review = reviewOf(issue.metricId);
                  const label = (REVIEW_OPTIONS.find(([value]) => value === review.status) || [])[1] || "待复核";
                  return `<tr>
                    <td>${index + 1}</td>
                    <td><strong>${escapeHtml(issue.metricId)}</strong></td>
                    <td>${escapeHtml(issue.title)}</td>
                    <td class="${review.status === "confirmed" ? "review-confirmed" : review.status === "dismissed" ? "review-dismissed" : ""}">${escapeHtml(label)}</td>
                    <td>${escapeHtml(review.note || "—")}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
          <p class="muted" style="margin-top:8px;">已完成复核 ${reviewed.length} 项 / 待复核 ${reviewRows.length - reviewed.length} 项。</p>
        ` : `<p class="muted">本案例未产生需人工复核的疑点。</p>`}
      </section>

      <section class="report-section">
        <h2>六、核查依据、数据完整度与责任边界</h2>
        <p>本报告以企业申报声明与原始数据凭证为输入，按 A 绿色真实性（40）、B 环境合规（15）、C 财务勾稽与偿债（20）、D 社会风险（10）、E 治理风险（15）五个维度共 28 项指标逐项计算并按分档规则评分，总分 100 分。等级线为：≥85 通过、70—84 有条件通过、55—69 审慎通过、&lt;55 不予认定；一票否决规则 R1—R5 独立于百分制，触发任一项即输出“不予绿色认定”。</p>
        <p>数据完整度：${formatPercent(confidence.coverage, 0)}（${escapeHtml(confidence.notes.join("；"))}）。缺失指标的原始数据未取得时按中性分（权重的50%）计，并在疑点清单中标注，结论置信度相应降级。</p>
        <div class="report-advice">责任边界：本系统为辅助尽调工具，只输出真实性评分、疑点清单与核查意见，不替代银行审批。绿色属性的最终认定结论由银行有权人员出具，本报告不构成自动审批结论；绿色贷款统计口径以人民银行《绿色贷款专项统计制度》为准，本系统不创设新的认定权限。</div>
      </section>

      <section class="report-section">
        <h2>七、操作留痕</h2>
        <ol class="trail-list">
          ${(state.trail.length ? state.trail : [{ time: date, action: "载入案例并生成核查结论" }]).map((item) => `<li><span>${escapeHtml(formatDateTime(item.time))}</span>${escapeHtml(item.action)}</li>`).join("")}
        </ol>
      </section>

      <footer class="report-sign">
        <div class="report-stamp">绿信盾<br>规则引擎<br>核查专用</div>
        <div>
          <div>核查机构：绿信盾绿色金融科技创新实验室</div>
          <div>核查方式：规则引擎自动核查（可复算）</div>
          <div>报告日期：${escapeHtml(formatDate(date))}</div>
        </div>
      </footer>
      <div class="report-disclaimer">本报告用于产品演示，不构成真实金融决策依据；打印前请确认浏览器缩放为100%。</div>
    `;

    requestAnimationFrame(() => drawRadar(result));
  }

  function drawRadar(result) {
    const canvas = document.getElementById("report-radar");
    if (!canvas || !canvas.offsetParent) return;
    const { context, width, height } = resizeCanvas(canvas);
    if (width < 80) return;
    const centerX = width / 2;
    const centerY = height / 2 + (height > 340 ? 8 : 0);
    const radius = Math.min(width, height) * 0.30;
    const axes = result.dimensions.map((dimension) => ({
      label: dimension.short || dimension.name,
      ratio: Math.max(0, Math.min(1, dimension.ratio))
    }));
    const angleStep = Math.PI * 2 / axes.length;
    const angleAt = (index) => -Math.PI / 2 + angleStep * index;
    const pointAt = (index, ratio) => ({
      x: centerX + Math.cos(angleAt(index)) * radius * ratio,
      y: centerY + Math.sin(angleAt(index)) * radius * ratio
    });

    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;
    context.strokeStyle = themeVar("--chart-grid", "#e4ece7");
    [0.25, 0.5, 0.75, 1].forEach((level) => {
      context.beginPath();
      axes.forEach((_, index) => {
        const point = pointAt(index, level);
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.closePath();
      context.stroke();
    });

    context.strokeStyle = themeVar("--chart-axis", "#e9f0ec");
    axes.forEach((_, index) => {
      const point = pointAt(index, 1);
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.lineTo(point.x, point.y);
      context.stroke();
    });

    context.beginPath();
    axes.forEach((axis, index) => {
      const point = pointAt(index, axis.ratio);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fillStyle = themeVar("--chart-fill", "rgba(18, 160, 116, .16)");
    context.fill();
    context.strokeStyle = themeVar("--chart-stroke", "#0d8a66");
    context.lineWidth = 2.2;
    context.lineJoin = "round";
    context.stroke();

    axes.forEach((axis, index) => {
      const dot = pointAt(index, axis.ratio);
      context.beginPath();
      context.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
      context.fillStyle = themeVar("--paper", "#ffffff");
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = themeVar("--chart-stroke", "#0d8a66");
      context.stroke();
    });

    context.textAlign = "center";
    context.textBaseline = "middle";
    axes.forEach((axis, index) => {
      const label = pointAt(index, 1.2);
      const percent = pointAt(index, 1.2);
      context.fillStyle = themeVar("--ink", "#25332c");
      context.font = '700 12px "Inter", "Microsoft YaHei", sans-serif';
      context.fillText(axis.label, label.x, label.y - 7);
      context.fillStyle = themeVar("--muted-2", "#84948c");
      context.font = '500 10.5px "Inter", "Microsoft YaHei", sans-serif';
      context.fillText(`${fixed(axis.ratio * 100, 0)}%`, percent.x, percent.y + 8);
    });
  }

  /* ---------------- 行业洞察 ---------------- */

  function buildGreenLoanChart(rows) {
    const W = 780;
    const H = 332;
    const L = 56;
    const R = 60;
    const T = 42;
    const B = 46;
    const plotW = W - L - R;
    const plotH = H - T - B;
    const maxBalance = 50;
    const maxGrowth = 40;
    const step = plotW / rows.length;
    const barW = Math.min(52, step * 0.4);
    const baseY = T + plotH;
    const yB = (value) => T + plotH - (value / maxBalance) * plotH;
    const yG = (value) => T + plotH - (value / maxGrowth) * plotH;

    const grid = [0, 10, 20, 30, 40, 50].map((value) => {
      const y = yB(value);
      return `<line x1="${L}" y1="${y}" x2="${W - R}" y2="${y}" style="stroke:var(--chart-grid)" stroke-dasharray="3 4"/>` +
        `<text x="${L - 10}" y="${y + 4}" text-anchor="end" font-size="10.5" style="fill:var(--muted-2)">${value}</text>`;
    }).join("");

    const bars = rows.map((row, index) => {
      const cx = L + step * index + step / 2;
      const y = yB(row.balance);
      return `<rect x="${fixed(cx - barW / 2, 1)}" y="${fixed(y, 1)}" width="${barW}" height="${fixed(baseY - y, 1)}" rx="6" fill="${row.partial ? "#8fd6bc" : "url(#glBar)"}"/>` +
        `<text x="${fixed(cx, 1)}" y="${fixed(y - 9, 1)}" text-anchor="middle" font-size="12" font-weight="700" style="fill:var(--ink)">${row.balance}</text>` +
        `<text x="${fixed(cx, 1)}" y="${baseY + 23}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${row.year}</text>`;
    }).join("");

    const points = rows.map((row, index) => `${fixed(L + step * index + step / 2, 1)},${fixed(yG(row.growth), 1)}`).join(" ");
    const dots = rows.map((row, index) => {
      const cx = fixed(L + step * index + step / 2, 1);
      const cy = fixed(yG(row.growth), 1);
      return `<circle cx="${cx}" cy="${cy}" r="4" fill="#fff" stroke="#c08a2e" stroke-width="2.2"/>` +
        `<text x="${cx}" y="${fixed(Number(cy) - 10, 1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a06415" stroke="#ffffff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">${row.growth}%</text>`;
    }).join("");

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="绿色贷款余额与同比增速">
      <defs>
        <linearGradient id="glBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3dbf92"/>
          <stop offset="100%" stop-color="#0d8a66"/>
        </linearGradient>
      </defs>
      ${grid}
      ${bars}
      <polyline points="${points}" fill="none" stroke="#c08a2e" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
      <line x1="${L}" y1="${baseY}" x2="${W - R}" y2="${baseY}" style="stroke:var(--chart-axis)"/>
      <text x="${L}" y="20" font-size="10.5" style="fill:var(--muted-2)">余额（万亿元）</text>
      <text x="${W - R}" y="20" text-anchor="end" font-size="10.5" style="fill:var(--muted-2)">同比增速（%）</text>
    </svg>`;
  }

  function buildJusticeDonut(justice) {
    const size = 240;
    const cx = 120;
    const cy = 120;
    const radius = 82;
    const stroke = 26;
    const circumference = 2 * Math.PI * radius;
    const segments = [
      { label: "民事", value: justice.civil, color: "#2f6fb0" },
      { label: "行政", value: justice.admin, color: "#c08a2e" },
      { label: "刑事", value: justice.criminal, color: "#cf2e22" }
    ];
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    let offset = 0;
    const arcs = segments.map((segment) => {
      const length = (segment.value / total) * circumference;
      const arc = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${segment.color}" stroke-width="${stroke}"
        stroke-dasharray="${fixed(length, 2)} ${fixed(circumference - length, 2)}"
        stroke-dashoffset="${fixed(-offset, 2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += length;
      return arc;
    }).join("");
    const percent = (value) => fixed((value / total) * 100, 1);
    const legend = segments.map((segment) => `<span><i style="background:${segment.color}"></i>${segment.label}<strong>${segment.value} 万 · ${percent(segment.value)}%</strong></span>`).join("");
    return `<div class="donut-wrap">
      <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="2025 年环境资源一审案件结构" style="max-width:230px">
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#eef2ef" stroke-width="${stroke}"/>
        ${arcs}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="26" font-weight="800" style="fill:var(--ink)">${total}</text>
        <text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="10.5" style="fill:var(--muted)">万件 · ${justice.year}</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>`;
  }

  function buildCaseScoreChart() {
    if (!dataProvider || !engine) return "";
    const rows = dataProvider.getEnterpriseCatalog()
      .filter((company) => company.builtIn)
      .map((company) => {
        const raw = dataProvider.getEnterpriseRawData(company.id);
        const result = engine.evaluateEnterprise(raw);
        return {
          name: company.shortName,
          score: result.totalScore,
          grade: result.grade,
          veto: result.veto
        };
      })
      .sort((a, b) => b.score - a.score);

    const colorOf = (row) => {
      if (row.veto.triggered) return "#cf2e22";
      if (row.grade.code === "pass") return "#0d8a66";
      if (row.grade.code === "conditional") return "#c08a2e";
      return "#b42318";
    };

    const W = 660;
    const rowH = 54;
    const L = 96;
    const barW = 372;
    const T = 16;
    const H = rows.length * rowH + T + 8;
    const bars = rows.map((row, index) => {
      const y = T + index * rowH + 12;
      const width = Math.max(2, (row.score / 100) * barW);
      const vetoLabel = row.veto.triggered ? ` · ${row.veto.rules.map((rule) => rule.id).join("/")} 否决` : "";
      return `<text x="0" y="${y + 14}" font-size="12" font-weight="700" style="fill:var(--ink-soft)">${escapeHtml(row.name)}</text>
        <rect x="${L}" y="${y + 4}" width="${barW}" height="12" rx="6" style="fill:var(--chart-track)"/>
        <rect x="${L}" y="${y + 4}" width="${fixed(width, 1)}" height="12" rx="6" fill="${colorOf(row)}"/>
        <text x="${L + barW + 10}" y="${y + 15}" font-size="12" font-weight="750" style="fill:var(--ink)">${row.score}</text>
        <text x="${L + barW + 36}" y="${y + 15}" font-size="11" style="fill:var(--muted)">${escapeHtml(row.grade.label)}${escapeHtml(vetoLabel)}</text>`;
    }).join("");

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="四家演示企业的模型得分">
      <line x1="${L}" y1="${T}" x2="${L}" y2="${H - 8}" style="stroke:var(--chart-axis)"/>
      ${bars}
    </svg>`;
  }

  function renderInsightStats(data) {
    const first = data.GREEN_LOAN[0];
    const multiple = fixed(data.LATEST.balance / first.balance, 1);
    const civilShare = fixed((data.JUSTICE.civil / data.JUSTICE.total) * 100, 0);
    return `
      <div class="stat-card">
        <span>绿色贷款余额（${escapeHtml(data.LATEST.period)}）</span>
        <strong>${data.LATEST.balance}<em>万亿元</em></strong>
        <small>同比 +${data.LATEST.growth}% · 前三季度增加 ${data.LATEST.increase} 万亿</small>
      </div>
      <div class="stat-card">
        <span>五年规模变化</span>
        <strong>${multiple}<em>倍</em></strong>
        <small>${first.year} 年末 ${first.balance} 万亿 → ${data.LATEST.period} ${data.LATEST.balance} 万亿</small>
      </div>
      <div class="stat-card">
        <span>环境资源一审案件（${data.JUSTICE.year}）</span>
        <strong>${data.JUSTICE.total}<em>万件</em></strong>
        <small>公益诉讼 ${data.JUSTICE.publicInterest.toLocaleString("zh-CN")} 件 · 民事占 ${civilShare}%</small>
      </div>
    `;
  }

  function renderInsightSources(data) {
    const groups = {};
    data.SOURCES.forEach((source) => {
      if (!groups[source.group]) groups[source.group] = [];
      groups[source.group].push(source);
    });
    return Object.entries(groups).map(([group, list]) => `
      <div class="source-group">
        <h4>${escapeHtml(group)}</h4>
        <ol>${list.map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a><span class="muted">（${escapeHtml(source.date)}）</span></li>`).join("")}</ol>
      </div>
    `).join("");
  }

  function renderInsights() {
    const stats = document.getElementById("insight-stats");
    const greenChart = document.getElementById("chart-green-loan");
    const justiceChart = document.getElementById("chart-justice");
    const caseChart = document.getElementById("chart-cases");
    const sources = document.getElementById("insight-sources");
    if (!stats || !greenChart || !justiceChart || !caseChart || !sources) return;
    if (!insightsData) {
      greenChart.innerHTML = `<div class="empty-mini">行业数据模块未加载，请确认 insights.js 与 index.html 在同一目录。</div>`;
      return;
    }
    stats.innerHTML = renderInsightStats(insightsData);
    const rows = insightsData.GREEN_LOAN.concat([{ year: "26Q3*", balance: insightsData.LATEST.balance, growth: insightsData.LATEST.growth, partial: true }]);
    greenChart.innerHTML = buildGreenLoanChart(rows);
    justiceChart.innerHTML = buildJusticeDonut(insightsData.JUSTICE);
    caseChart.innerHTML = buildCaseScoreChart();
    sources.innerHTML = renderInsightSources(insightsData);
  }

  /* ---------------- 自定义录入表单 ---------------- */

  function field(label, path, value, options) {
    const config = options || {};
    const className = config.wide ? "field wide" : config.full ? "field full" : "field";
    if (config.type === "checkbox") {
      return `<label class="check-field"><input type="checkbox" data-path="${escapeHtml(path)}" data-value-type="boolean" ${value ? "checked" : ""}>${escapeHtml(label)}</label>`;
    }
    if (config.type === "select") {
      return `<div class="${className}"><label>${escapeHtml(label)}</label><select data-path="${escapeHtml(path)}" data-value-type="text">${config.options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}</select></div>`;
    }
    const inputType = config.type || "number";
    const step = config.step === undefined ? (inputType === "number" ? "0.01" : "") : config.step;
    const input = config.textarea
      ? `<textarea data-path="${escapeHtml(path)}" data-value-type="text">${escapeHtml(value)}</textarea>`
      : `<input type="${inputType}" data-path="${escapeHtml(path)}" data-value-type="${inputType === "number" ? "number" : "text"}" value="${escapeHtml(value)}" ${step ? `step="${step}"` : ""}>`;
    return `<div class="${className}"><label>${escapeHtml(label)}</label>${input}</div>`;
  }

  function monthFields(prefix, values) {
    return values.map((value, index) => `
      <div class="field month-field">
        <label>${index + 1}月</label>
        <input type="number" step="0.01" data-path="${escapeHtml(prefix)}[${index}]" data-value-type="number" value="${escapeHtml(value)}">
      </div>
    `).join("");
  }

  const FORM_SECTIONS = [
    {
      title: "一、企业识别信息",
      fields: [
        ["企业全称", "name", { type: "text", wide: true }],
        ["企业简称", "shortName", { type: "text" }],
        ["统一社会信用代码", "creditCode", { type: "text" }],
        ["所属行业", "industry", { type: "text" }],
        ["注册地区", "region", { type: "text" }],
        ["报告编号", "reportCode", { type: "text", wide: true }],
        ["项目名称", "projectName", { type: "text", full: true }],
        ["项目概况", "projectOverview", { type: "text", textarea: true, full: true }]
      ]
    },
    {
      title: "二、申报声明",
      fields: [
        ["业务品种", "claims.loanType", { type: "select", options: Object.entries(engine.LOAN_TYPES) }],
        ["宣称减排率（%）", "claims.emissionReductionRate", {}],
        ["申报投资额（万元）", "claims.investmentAmount", {}],
        ["产值增速（%）", "claims.productionGrowthRate", {}],
        ["计划进度（%）", "claims.plannedProgress", {}],
        ["项目分类", "claims.projectCategory", { type: "text", wide: true }],
        ["绿色目录代码", "claims.catalogCode", { type: "text" }],
        ["上年绿电占比（%）", "claims.greenPowerRatioPrior", {}],
        ["本年绿电占比（%）", "claims.greenPowerRatioCurrent", {}],
        ["项目计划贷款（万元）", "claims.projectLoanAmount", {}],
        ["计划自有资金（万元）", "claims.internalFundingAmount", {}]
      ]
    },
    {
      title: "三、用电与经营原始数据",
      fields: [
        ["上年单位产值能耗（吨标煤/万元）", "operation.energyIntensityPrior", { step: "0.001" }],
        ["本年单位产值能耗（吨标煤/万元）", "operation.energyIntensityCurrent", { step: "0.001" }],
        ["上年营业收入（万元）", "operation.revenuePrior", {}],
        ["本年营业收入（万元）", "operation.revenueCurrent", {}]
      ],
      months: true
    },
    {
      title: "四、项目手续与绿色凭证",
      fields: [
        ["环评批复文号", "project.eiaApprovalNo", { type: "text", wide: true }],
        ["第三方核证减排率（%）", "project.verifiedReductionRate", {}],
        ["绿电/碳交易凭证（份）", "project.greenVoucherCount", { step: "1" }],
        ["匹配核心工艺数", "project.matchedCoreProcesses", { step: "1" }],
        ["目录核心工艺数", "project.coreProcesses", { step: "1" }],
        ["项目实际进度（%）", "project.actualProgress", {}],
        ["项目已付现金（万元）", "project.projectPaidCash", {}],
        ["项目资产增量（万元）", "project.assetIncreaseProject", {}],
        ["项目完工金额（万元）", "project.projectCompletedAmount", {}]
      ],
      checks: [
        ["环评已批复", "project.eiaApproved"],
        ["环评仍有效", "project.eiaValidity"],
        ["项目与环评一致", "project.projectMatchesEia"],
        ["已通过节能审查", "project.energyAssessmentApproved"],
        ["已取得排污许可", "project.wastePermitHas"],
        ["排污许可有效", "project.wastePermitValid"],
        ["项目与许可一致", "project.projectMatchesPermit"],
        ["匹配绿色产业目录", "project.catalogMatched"],
        ["已取得核证报告", "project.verificationReportHas"]
      ]
    },
    {
      title: "五、财务报表原始科目",
      fields: [
        ["期初在建工程（万元）", "finance.cipPrior", {}],
        ["期末在建工程（万元）", "finance.cipCurrent", {}],
        ["期初固定资产原值（万元）", "finance.fixedAssetsPrior", {}],
        ["期末固定资产原值（万元）", "finance.fixedAssetsCurrent", {}],
        ["购建固定资产现金（万元）", "finance.cashPaidForFixedAssets", {}],
        ["资产总额（万元）", "finance.totalAssets", {}],
        ["负债总额（万元）", "finance.totalLiabilities", {}],
        ["行业平均资产负债率（%）", "finance.industryDebtRatio", {}],
        ["流动资产（万元）", "finance.currentAssets", {}],
        ["流动负债（万元）", "finance.currentLiabilities", {}],
        ["经营现金流净额（万元）", "finance.operatingCashFlow", {}],
        ["EBIT 息税前利润（万元）", "finance.ebit", {}],
        ["利息费用（万元）", "finance.interestExpense", {}],
        ["净利润（万元）", "finance.netProfit", {}],
        ["平均货币资金（万元）", "finance.averageCashAndEquivalents", {}],
        ["利息收入（万元）", "finance.interestIncome", {}],
        ["关联交易金额（万元）", "finance.relatedPartyTransactionAmount", {}],
        ["最近一期审计意见", "finance.auditOpinion", {
          type: "select",
          options: [["unqualified", "标准无保留意见"], ["emphasis", "带强调事项段"], ["qualified", "保留意见"], ["adverse", "否定意见"], ["disclaimer", "无法表示意见"]]
        }]
      ]
    },
    {
      title: "六、环境合规与社会风险",
      fields: [
        ["近36个月环保处罚次数", "compliance.envPenaltyCount36m", { step: "1" }],
        ["申报前12个月环保处罚次数", "compliance.envPenaltyCount12m", { step: "1" }],
        ["污染物超标监测次数", "compliance.monitoringExceedances", { step: "1" }],
        ["逾期未整改事项", "compliance.overdueRectifications", { step: "1" }],
        ["环保信用等级", "compliance.environmentalCreditRating", { type: "select", options: [["A", "A级"], ["B", "B级"], ["C", "C级"], ["D", "D级"]] }],
        ["环保诉讼状态", "compliance.envLitigationStatus", { type: "select", options: [["none", "无诉讼"], ["resolvedMinor", "一般诉讼已了结"], ["pendingMinor", "未决一般诉讼"], ["pendingMajor", "未决重大诉讼"]] }],
        ["近12个月环保负面舆情（条）", "compliance.envNegativeNewsCount", { step: "1" }],
        ["近24个月劳动仲裁/诉讼（起）", "compliance.laborDisputeCount", { step: "1" }],
        ["社保欠缴月数", "compliance.socialInsuranceOverdueMonths", { step: "1" }],
        ["近36个月安全生产处罚（次）", "compliance.safetyPenaltyCount", { step: "1" }]
      ],
      checks: [
        ["处罚与本项目关联", "compliance.envPenaltyRelatedToProject"],
        ["存在欠薪舆情", "compliance.wageArrearNews"]
      ]
    },
    {
      title: "七、治理与征信",
      fields: [
        ["控股股东质押率（%）", "governance.pledgeRatio", {}],
        ["近24个月信披违规次数", "governance.disclosureViolations", { step: "1" }],
        ["近36个月高管违规次数", "governance.executiveViolationCount", { step: "1" }]
      ],
      checks: [["实控人失信被执行人", "governance.controllerDishonesty"]]
    }
  ];

  function renderCustomForm() {
    const raw = state.customTemplate;
    customForm.innerHTML = FORM_SECTIONS.map((section) => `
      <section class="form-section">
        <h3>${escapeHtml(section.title)}</h3>
        <div class="form-grid">
          ${section.fields.map(([label, path, options]) => field(label, path, getValueByPath(raw, path), options)).join("")}
        </div>
        ${section.months ? `
          <div class="field full" style="margin-top:12px"><label>上年12个月用电量（MWh）</label><div class="months-grid">${monthFields("operation.electricityPrior", raw.operation.electricityPrior)}</div></div>
          <div class="field full" style="margin-top:12px"><label>本年12个月用电量（MWh）</label><div class="months-grid">${monthFields("operation.electricityCurrent", raw.operation.electricityCurrent)}</div></div>
        ` : ""}
        ${section.checks ? `<div class="check-grid" style="margin-top:12px">${section.checks.map(([label, path]) => field(label, path, getValueByPath(raw, path), { type: "checkbox" })).join("")}</div>` : ""}
      </section>
    `).join("") + `
      <div id="form-errors"></div>
      <section class="form-section">
        <div class="btn-row">
          <button class="btn btn-primary" type="submit">开始核查</button>
          <button class="btn" type="button" data-reset-custom>清空，重新录入</button>
        </div>
      </section>
    `;
  }

  function collectCustomData() {
    const raw = JSON.parse(JSON.stringify(state.customTemplate));
    customForm.querySelectorAll("[data-path]").forEach((element) => {
      const path = element.dataset.path;
      let value;
      if (element.type === "checkbox") value = element.checked;
      else if (element.dataset.valueType === "number") {
        const text = element.value.trim();
        value = text === "" ? null : Number(text);
        if (value !== null && !Number.isFinite(value)) value = null;
      } else value = element.value;
      setValueByPath(raw, path, value);
    });
    raw.id = "custom";
    return raw;
  }

  function renderFormErrors(errors) {
    const box = document.getElementById("form-errors");
    if (!box) return;
    box.innerHTML = errors.length ? `<div class="form-errors" role="alert">${errors.map(escapeHtml).join("<br>")}</div>` : "";
  }

  caseGrid.addEventListener("click", (event) => {
    const caseButton = event.target.closest("[data-case-id]");
    if (caseButton) {
      selectEnterprise(caseButton.dataset.caseId);
      return;
    }
    if (event.target.closest("[data-open-custom]")) {
      customPanel.hidden = false;
      renderCustomForm();
      showToast("已展开完整原始数据录入表单");
      customPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  closeCustomButton.addEventListener("click", () => {
    customPanel.hidden = true;
  });

  customForm.addEventListener("click", (event) => {
    if (event.target.closest("[data-reset-custom]")) {
      state.customTemplate = dataProvider.createBlankCustomTemplate();
      renderCustomForm();
      renderFormErrors([]);
      showToast("已清空表单，可重新录入原始数据");
    }
  });

  customForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = collectCustomData();
    const errors = engine.validateRawData(raw);
    if (!raw.projectName) errors.push("项目名称不能为空");
    if (!raw.shortName) errors.push("企业简称不能为空");
    renderFormErrors(errors);
    if (errors.length) {
      showToast("原始数据校验未通过");
      const box = document.getElementById("form-errors");
      if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    dataProvider.registerCustomEnterprise(raw);
    renderCases();
    selectEnterprise("custom");
  });

  navButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.addEventListener("click", (event) => {
    const goButton = event.target.closest("[data-go]");
    if (goButton) switchView(goButton.dataset.go);
  });

  printButton.addEventListener("click", () => {
    renderReport();
    pushTrail("打印/导出核查报告");
    window.print();
  });

  window.addEventListener("resize", () => {
    if (state.result && !views.workspace.hidden) drawGauge(state.result);
    if (state.result && !views.report.hidden) drawRadar(state.result);
  });

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  }
  applyTheme(document.documentElement.dataset.theme || "light");

  renderCases();
  setNavAvailability();
})();
