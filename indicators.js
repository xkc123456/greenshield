(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.Indicators = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  // 五个维度与计划书附录完全一致：A40 + B15 + C20 + D10 + E15 = 100
  const DIMENSIONS = Object.freeze({
    A: { key: "A", name: "绿色真实性", weight: 40, short: "绿色真实性" },
    B: { key: "B", name: "环境合规", weight: 15, short: "环境合规" },
    C: { key: "C", name: "财务勾稽与偿债", weight: 20, short: "财务勾稽" },
    D: { key: "D", name: "社会风险", weight: 10, short: "社会风险" },
    E: { key: "E", name: "治理风险", weight: 15, short: "治理风险" }
  });

  // 28 项指标权重，与《商业计划书》附录表格逐项对应，合计 100 分。
  const METRIC_WEIGHTS = Object.freeze({
    A1: 8, A2: 6, A3: 8, A4: 6, A5: 4, A6: 4, A7: 2, A8: 2,
    B1: 6, B2: 5, B3: 2, B4: 2,
    C1: 4, C2: 1, C3: 4, C4: 4, C5: 3, C6: 2, C7: 2,
    D1: 4, D2: 3, D3: 2, D4: 1,
    E1: 5, E2: 3, E3: 3, E4: 2, E5: 2
  });

  // 数据来源五类，用于在界面上标明每个指标的取数通道。
  const DATA_SOURCES = Object.freeze({
    declare: "申报材料",
    grid: "用电与能耗",
    finance: "财务报表",
    public: "环保与司法公开",
    credit: "行内征信"
  });

  const LOAN_TYPES = Object.freeze({
    project: "项目类贷款",
    workingCapital: "绿色流动资金贷款",
    supplyChain: "绿色供应链融资"
  });

  // 一票否决规则。R1 按计划书限定：仅适用于须履行环评程序的项目类贷款。
  const VETO_RULES = Object.freeze([
    {
      id: "R1",
      name: "无环评批复",
      description: "项目类贷款未提供有效环境影响评价批复（流动资金、供应链融资不适用）。",
      test: (raw) => raw.claims.loanType !== "workingCapital" && raw.claims.loanType !== "supplyChain" && !raw.project.eiaApproved
    },
    {
      id: "R2",
      name: "项目与绿色产业目录完全不符",
      description: "申报项目未匹配绿色产业目录核心支持范围。",
      test: (raw) => !raw.project.catalogMatched
    },
    {
      id: "R3",
      name: "投资落地率低于10%",
      description: "项目资产增量不足申报投资额的10%。",
      test: (raw, metricMap) => Boolean(metricMap.A3 && metricMap.A3.value < 0.1)
    },
    {
      id: "R4",
      name: "存在未决重大环保诉讼",
      description: "企业存在尚未结案的重大环境保护诉讼。",
      test: (raw) => raw.compliance.envLitigationStatus === "pendingMajor"
    },
    {
      id: "R5",
      name: "实控人列入失信被执行人名单",
      description: "实际控制人被列入失信被执行人名单。",
      test: (raw) => Boolean(raw.governance.controllerDishonesty)
    }
  ]);

  function sum(values) {
    return (values || []).reduce((total, value) => total + Number(value || 0), 0);
  }

  function num(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function has(value) {
    return value !== undefined && value !== null && Number.isFinite(Number(value));
  }

  function safeDivide(numerator, denominator) {
    return Math.abs(Number(denominator)) < 0.0000001 ? 0 : Number(numerator) / Number(denominator);
  }

  function growthRate(previous, current) {
    return safeDivide(Number(current) - Number(previous), Math.abs(Number(previous)));
  }

  function fixed(value, digits) {
    const factor = Math.pow(10, digits === undefined ? 2 : digits);
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  }

  function pct(value, digits) {
    return `${fixed(Number(value || 0) * 100, digits === undefined ? 1 : digits)}%`;
  }

  function pp(value) {
    return `${fixed(Number(value || 0), 1)}个百分点`;
  }

  function money(value) {
    return `${fixed(value, 2).toLocaleString("zh-CN")}万元`;
  }

  function times(value) {
    return `${fixed(value, 2)}倍`;
  }

  // 通用分档函数：所有 28 项指标共用，保证同一指标值在任何场景下得到同一分数。
  function scoreByBands(value, bands) {
    const number = Number(value);
    for (const band of bands) {
      if (Object.prototype.hasOwnProperty.call(band, "lt") && number < band.lt) return band.score;
      if (Object.prototype.hasOwnProperty.call(band, "lte") && number <= band.lte) return band.score;
      if (Object.prototype.hasOwnProperty.call(band, "gt") && number > band.gt) return band.score;
      if (Object.prototype.hasOwnProperty.call(band, "gte") && number >= band.gte) return band.score;
    }
    return 0;
  }

  const LOWER_IS_BETTER = (bands) => bands.map(([threshold, score]) => ({ lte: threshold, score }));
  const HIGHER_IS_BETTER = (bands) => bands.map(([threshold, score]) => ({ gte: threshold, score }));

  function result(value, calculation, rawSnapshot) {
    return { value: fixed(value, 4), calculation, rawSnapshot };
  }

  function fixedAssetIncrement(raw) {
    return (
      num(raw.finance.cipCurrent) - num(raw.finance.cipPrior) +
      num(raw.finance.fixedAssetsCurrent) - num(raw.finance.fixedAssetsPrior)
    );
  }

  /* ---------------- A 绿色真实性（40分） ---------------- */

  // A1：理论用电=去年同期×(1+产值增速)×(1-宣称减排率)，用实际偏离识别“宣称减排但用电未降”。
  function calculateA1(raw) {
    const prior = sum(raw.operation.electricityPrior);
    const current = sum(raw.operation.electricityCurrent);
    const outputGrowth = num(raw.claims.productionGrowthRate) / 100;
    const claim = num(raw.claims.emissionReductionRate) / 100;
    const theory = prior * (1 + outputGrowth) * (1 - claim);
    const value = safeDivide(current - theory, theory);
    return result(
      value,
      `去年同期${fixed(prior, 0)}MWh，本年实际${fixed(current, 0)}MWh，理论${fixed(theory, 0)}MWh，偏离率=${pct(value)}`,
      `产值增速${pct(outputGrowth)}；宣称减排${pct(claim)}`
    );
  }

  // A2：实际能耗强度降幅 ÷ 宣称减排率，衡量声明与单耗改善是否匹配。
  function calculateA2(raw) {
    const prior = num(raw.operation.energyIntensityPrior);
    const current = num(raw.operation.energyIntensityCurrent);
    const actualDrop = safeDivide(prior - current, prior);
    const claim = num(raw.claims.emissionReductionRate) / 100;
    const value = safeDivide(actualDrop, claim);
    return result(
      value,
      `能耗强度${fixed(prior, 3)}→${fixed(current, 3)}（降${pct(actualDrop)}）÷ 宣称减排${pct(claim)}=${pct(value)}`,
      `实际降幅${pct(actualDrop)}；宣称${pct(claim)}`
    );
  }

  // A3：项目资产增量 ÷ 申报投资额，低于10%触发 R3。
  function calculateA3(raw) {
    const value = safeDivide(raw.project.assetIncreaseProject, raw.claims.investmentAmount);
    return result(value, `项目资产增量${money(raw.project.assetIncreaseProject)}÷申报投资${money(raw.claims.investmentAmount)}=${pct(value)}`, "在建工程＋固定资产联合台账");
  }

  // A4：现金流出与资产形成的勾稽差，占申报投资额比重。
  function calculateA4(raw) {
    const increment = fixedAssetIncrement(raw);
    const value = safeDivide(Math.abs(num(raw.finance.cashPaidForFixedAssets) - increment), raw.claims.investmentAmount);
    return result(value, `|购建现金${money(raw.finance.cashPaidForFixedAssets)}−资产增量${money(increment)}|÷${money(raw.claims.investmentAmount)}=${pct(value)}`, `在建工程增量${money(num(raw.finance.cipCurrent) - num(raw.finance.cipPrior))}`);
  }

  // A5：环评、能评、排污许可三项齐备性。
  function calculateA5(raw) {
    const items = [
      ["环评批复", Boolean(raw.project.eiaApproved)],
      ["节能审查", Boolean(raw.project.energyAssessmentApproved)],
      ["排污许可", Boolean(raw.project.wastePermitHas)]
    ];
    const got = items.filter(([, ok]) => ok).length;
    const value = got / 3;
    return result(value, `${items.map(([label, ok]) => `${label}=${ok ? "齐备" : "缺失"}`).join("；")}，齐备率=${pct(value)}`, `环评文号：${raw.project.eiaApprovalNo || "无"}`);
  }

  // A6：申报前12个月环保处罚次数，与项目关联的处罚额外加权。
  function calculateA6(raw) {
    const count = num(raw.compliance.envPenaltyCount12m);
    const related = Boolean(raw.compliance.envPenaltyRelatedToProject);
    const value = count + (related ? 1 : 0);
    return result(value, `申报前12个月处罚${count}次，${related ? "存在与本项目直接关联的处罚" : "无与本项目直接关联的处罚"}，加权=${fixed(value, 0)}`, "行政处罚决定书与项目环评范围比对");
  }

  // A7：宣称技术路线与绿色目录核心工艺的匹配度。
  function calculateA7(raw) {
    const value = safeDivide(raw.project.matchedCoreProcesses, raw.project.coreProcesses);
    return result(value, `匹配核心工艺${num(raw.project.matchedCoreProcesses)}项÷目录核心工艺${num(raw.project.coreProcesses)}项=${pct(value)}`, `目录匹配=${raw.project.catalogMatched ? "是" : "否"}`);
  }

  // A8：绿电/碳交易凭证（60%）＋第三方核证报告（40%）。
  function calculateA8(raw) {
    const vouchers = Math.min(num(raw.project.greenVoucherCount), 2) / 2;
    const value = vouchers * 0.6 + (raw.project.verificationReportHas ? 0.4 : 0);
    return result(value, `绿电/碳交易凭证${num(raw.project.greenVoucherCount)}份（满2份计0.6），核证报告${raw.project.verificationReportHas ? "已取得" : "未取得"}（计0.4）→ ${pct(value)}`, `第三方核证减排率${pp(raw.project.verifiedReductionRate)}`);
  }

  /* ---------------- B 环境合规（15分） ---------------- */

  function calculateB1(raw) {
    const value = num(raw.compliance.envPenaltyCount36m);
    return result(value, `近36个月环保行政处罚${fixed(value, 0)}次`, "生态环境部门行政处罚决定书");
  }

  function calculateB2(raw) {
    const map = { A: 1, B: 0.7, C: 0.35, D: 0 };
    const value = map[raw.compliance.environmentalCreditRating] === undefined ? 0 : map[raw.compliance.environmentalCreditRating];
    return result(value, `环境信用等级=${raw.compliance.environmentalCreditRating || "未提供"}（A=1，B=0.7，C=0.35，D=0）`, "生态环境主管部门年度信用评价");
  }

  function calculateB3(raw) {
    const has = Boolean(raw.project.wastePermitHas);
    const valid = Boolean(raw.project.wastePermitValid);
    const match = Boolean(raw.project.projectMatchesPermit);
    const value = has && valid && match ? 1 : has && valid ? 0.5 : 0;
    return result(value, `许可存在=${has ? "是" : "否"}，有效=${valid ? "是" : "否"}，项目范围一致=${match ? "是" : "否"}`, "排污许可证副本与建设内容比对");
  }

  function calculateB4(raw) {
    const value = num(raw.compliance.envNegativeNewsCount);
    return result(value, `近12个月环保负面舆情${fixed(value, 0)}条`, "公开舆情与执法通报");
  }

  /* ---------------- C 财务勾稽与偿债（20分） ---------------- */

  function calculateC1(raw) {
    const debtRatio = safeDivide(raw.finance.totalLiabilities, raw.finance.totalAssets);
    const industry = num(raw.finance.industryDebtRatio) / 100;
    const value = Math.abs(debtRatio - industry);
    return result(value, `资产负债率${pct(debtRatio)}，行业均值${pct(industry)}，偏离=${pp(value * 100)}`, `负债${money(raw.finance.totalLiabilities)}÷资产${money(raw.finance.totalAssets)}`);
  }

  function calculateC2(raw) {
    const value = safeDivide(raw.finance.currentAssets, raw.finance.currentLiabilities);
    return result(value, `流动资产${money(raw.finance.currentAssets)}÷流动负债${money(raw.finance.currentLiabilities)}=${times(value)}`, "流动比率≥1.2视为充足");
  }

  function calculateC3(raw) {
    const value = safeDivide(raw.finance.operatingCashFlow, raw.finance.currentLiabilities);
    return result(value, `经营现金流净额${money(raw.finance.operatingCashFlow)}÷流动负债${money(raw.finance.currentLiabilities)}=${pct(value)}`, "现金流量表与到期债务结构");
  }

  function calculateC4(raw) {
    const value = safeDivide(raw.finance.ebit, raw.finance.interestExpense);
    return result(value, `EBIT ${money(raw.finance.ebit)}÷利息费用${money(raw.finance.interestExpense)}=${times(value)}`, "利润表与财务费用明细");
  }

  function calculateC5(raw) {
    const declared = num(raw.claims.productionGrowthRate) / 100;
    const reported = growthRate(raw.operation.revenuePrior, raw.operation.revenueCurrent);
    const value = Math.abs(declared - reported);
    return result(value, `申报产值增速${pct(declared)}，利润表营收增速${pct(reported)}，偏离=${pp(value * 100)}`, "申报产量×价格与营业收入核对");
  }

  function calculateC6(raw) {
    const profit = num(raw.finance.netProfit);
    const cash = num(raw.finance.operatingCashFlow);
    const value = safeDivide(Math.abs(cash - profit), Math.abs(profit));
    return result(value, `经营现金流${money(cash)}与净利润${money(profit)}差异率=${pct(value)}`, "现金流量表补充资料");
  }

  function calculateC7(raw) {
    const rate = safeDivide(raw.finance.interestIncome, raw.finance.averageCashAndEquivalents);
    const value = safeDivide(Math.abs(rate - 0.015), 0.015);
    return result(value, `利息收入${money(raw.finance.interestIncome)}÷平均货币资金${money(raw.finance.averageCashAndEquivalents)}=${pct(rate)}，与1.5%基准偏差${pct(value)}`, "银行询证函与对账单，识别存贷双虚");
  }

  /* ---------------- D 社会风险（10分） ---------------- */

  function calculateD1(raw) {
    const value = num(raw.compliance.laborDisputeCount);
    return result(value, `近24个月劳动仲裁/诉讼${fixed(value, 0)}起`, "裁判文书与仲裁裁决");
  }

  function calculateD2(raw) {
    const value = num(raw.compliance.socialInsuranceOverdueMonths);
    return result(value, `社保欠缴${fixed(value, 0)}个月`, "社保缴费记录");
  }

  function calculateD3(raw) {
    const value = num(raw.compliance.safetyPenaltyCount);
    return result(value, `近36个月安全生产处罚${fixed(value, 0)}次`, "应急管理部门处罚记录");
  }

  function calculateD4(raw) {
    const value = raw.compliance.wageArrearNews ? 1 : 0;
    return result(value, `欠薪舆情=${value ? "命中" : "未命中"}`, "舆情监测与劳动监察通报");
  }

  /* ---------------- E 治理风险（15分） ---------------- */

  function calculateE1(raw) {
    const value = num(raw.governance.pledgeRatio) / 100;
    return result(value, `控股股东质押率=${pct(value)}`, "股权登记与质押公告");
  }

  function calculateE2(raw) {
    const value = safeDivide(raw.finance.relatedPartyTransactionAmount, raw.operation.revenueCurrent);
    return result(value, `关联交易${money(raw.finance.relatedPartyTransactionAmount)}÷营业收入${money(raw.operation.revenueCurrent)}=${pct(value)}`, "关联方往来与交易合同");
  }

  function calculateE3(raw) {
    const value = num(raw.governance.executiveViolationCount);
    return result(value, `近36个月高管违规记录${fixed(value, 0)}次`, "监管处罚与纪律处分");
  }

  function calculateE4(raw) {
    const map = { unqualified: 1, emphasis: 0.75, qualified: 0.4, adverse: 0, disclaimer: 0 };
    const value = map[raw.finance.auditOpinion] === undefined ? 0 : map[raw.finance.auditOpinion];
    return result(value, `最近一期审计意见=${raw.finance.auditOpinion || "未提供"}`, "标准无保留=1，带强调事项=0.75，保留=0.4，其他=0");
  }

  function calculateE5(raw) {
    const value = num(raw.governance.disclosureViolations);
    return result(value, `近24个月信息披露违规${fixed(value, 0)}次`, "问询函、纪律处分与整改公告");
  }

  function definition(id, dimension, name, formula, rawHint, source, compute, bands, advice, available) {
    return Object.freeze({ id, dimension, name, weight: METRIC_WEIGHTS[id], formula, rawHint, source, compute, bands, advice, available });
  }

  const METRIC_DEFINITIONS = Object.freeze([
    definition("A1", "A", "用电量与宣称减排偏离率", "理论用电量=去年同期×(1+产值增速)×(1−宣称减排率)；偏离率=(实际−理论)/理论", "24个月用电量、产值增速、宣称减排率", "grid", calculateA1, LOWER_IS_BETTER([[0.05, 8], [0.15, 5], [0.3, 2], [Infinity, 0]]), "核验分项能耗、产值与减排测算底稿。",
      (raw) => sum(raw.operation.electricityPrior) > 0 && sum(raw.operation.electricityCurrent) > 0),
    definition("A2", "A", "单位产值能耗合理性", "匹配度=实际能耗强度降幅÷宣称减排率（对照行业基准）", "上年/本年单位产值能耗、宣称减排率", "grid", calculateA2, HIGHER_IS_BETTER([[1, 6], [0.6, 4], [0.3, 2], [-Infinity, 0]]), "补充产量、产值与能源计量记录。",
      (raw) => has(raw.operation.energyIntensityPrior) && num(raw.operation.energyIntensityPrior) > 0 && num(raw.claims.emissionReductionRate) > 0),
    definition("A3", "A", "投资落地率", "（在建工程增量+固定资产增量）/申报投资额", "在建工程、固定资产与项目资产增量", "finance", calculateA3, HIGHER_IS_BETTER([[0.8, 8], [0.5, 5], [0.3, 2], [-Infinity, 0]]), "补充项目资产台账、合同、发票与验收单。",
      () => true),
    definition("A4", "A", "投资现金勾稽差", "|购建固定资产现金−(在建工程增量+固定资产原值增量)|/申报投资额", "现金流量表、在建工程与固定资产余额", "finance", calculateA4, LOWER_IS_BETTER([[0.1, 6], [0.3, 3], [Infinity, 0]]), "核查现金支出与资产入账的时点和金额。",
      () => true),
    definition("A5", "A", "项目手续完整性", "（环评批复+节能审查+排污许可）齐备项数/3", "环评批复、节能审查意见、排污许可证", "declare", calculateA5, HIGHER_IS_BETTER([[0.99, 4], [0.66, 2], [-Infinity, 0]]), "补齐三项手续并与项目建设内容核对。",
      () => true),
    definition("A6", "A", "处罚时点冲突", "申报前12个月环保处罚次数＋与本项目关联的处罚加权", "12个月处罚记录、处罚事由与项目关联性", "public", calculateA6, LOWER_IS_BETTER([[0, 4], [1, 2], [Infinity, 0]]), "核查处罚决定书、缴款凭证与整改闭环。",
      (raw) => has(raw.compliance.envPenaltyCount12m)),
    definition("A7", "A", "技术路线合理性", "匹配目录核心工艺数/目录核心工艺数", "技术路线说明与绿色目录工艺映射", "declare", calculateA7, HIGHER_IS_BETTER([[0.99, 2], [0.7, 1], [-Infinity, 0]]), "逐项映射目录工艺并核对设备参数。",
      (raw) => num(raw.project.coreProcesses) > 0),
    definition("A8", "A", "绿色凭证佐证", "绿电/碳交易凭证（60%）＋第三方核证报告（40%）", "绿电交易合同、碳配额凭证、核证报告", "declare", calculateA8, HIGHER_IS_BETTER([[0.99, 2], [0.5, 1], [-Infinity, 0]]), "取得绿电交易凭证与有资质机构核证报告。",
      () => true),
    definition("B1", "B", "近三年环保处罚", "近36个月环保行政处罚次数分档", "行政处罚决定书、环境信用记录", "public", calculateB1, LOWER_IS_BETTER([[0, 6], [1, 3], [2, 1], [Infinity, 0]]), "核验处罚、缴款与整改闭环材料。",
      (raw) => has(raw.compliance.envPenaltyCount36m)),
    definition("B2", "B", "环境信用等级", "A=1，B=0.7，C=0.35，D=0", "生态环境主管部门信用评价", "public", calculateB2, HIGHER_IS_BETTER([[0.99, 5], [0.65, 3], [0.3, 1], [-Infinity, 0]]), "跟踪信用修复与环境管理改进。",
      () => true),
    definition("B3", "B", "排污许可有效性", "许可存在、有效、项目范围一致三项联合判定", "排污许可证副本与建设内容", "public", calculateB3, HIGHER_IS_BETTER([[0.99, 2], [0.4, 1], [-Infinity, 0]]), "核对许可范围、排放口与项目变更情况。",
      () => true),
    definition("B4", "B", "环保舆情", "近12个月环保负面舆情条数", "舆情监测与执法通报", "public", calculateB4, LOWER_IS_BETTER([[0, 2], [2, 1], [Infinity, 0]]), "核查舆情事件处置与整改说明。",
      (raw) => has(raw.compliance.envNegativeNewsCount)),
    definition("C1", "C", "资产负债率行业偏离", "|资产负债率−行业均值|", "总资产、总负债、行业均值", "finance", calculateC1, LOWER_IS_BETTER([[0.1, 4], [0.2, 2], [0.35, 1], [Infinity, 0]]), "结合行业分位数判断杠杆合理性。",
      (raw) => num(raw.finance.totalAssets) > 0),
    definition("C2", "C", "流动比率", "流动资产/流动负债", "流动资产与流动负债", "finance", calculateC2, HIGHER_IS_BETTER([[1.2, 1], [0.8, 0.5], [-Infinity, 0]]), "核查短期偿债安排与受限资金。",
      (raw) => num(raw.finance.currentLiabilities) > 0),
    definition("C3", "C", "现金流负债比", "经营活动现金流净额/流动负债", "现金流量表与流动负债", "finance", calculateC3, HIGHER_IS_BETTER([[0.3, 4], [0.1, 2], [0.01, 1], [-Infinity, 0]]), "核查回款质量与到期债务结构。",
      (raw) => num(raw.finance.currentLiabilities) > 0),
    definition("C4", "C", "利息保障倍数", "EBIT/利息费用", "利润表与财务费用明细", "finance", calculateC4, HIGHER_IS_BETTER([[5, 4], [2.5, 2], [1.2, 1], [-Infinity, 0]]), "测算利率上行情形下的覆盖能力。",
      (raw) => num(raw.finance.interestExpense) > 0),
    definition("C5", "C", "申报产值与营收勾稽", "|申报产值增速−利润表营收增速|", "申报产量、价格与营业收入", "declare", calculateC5, LOWER_IS_BETTER([[0.05, 3], [0.15, 2], [0.3, 1], [Infinity, 0]]), "核对产销存台账与收入确认政策。",
      () => true),
    definition("C6", "C", "现金流与利润匹配", "|经营现金流净额−净利润|/|净利润|", "现金流量表与利润表", "finance", calculateC6, LOWER_IS_BETTER([[0.3, 2], [0.7, 1], [Infinity, 0]]), "关注收入确认与应计项目异常。",
      (raw) => num(raw.finance.netProfit) > 0),
    definition("C7", "C", "利息收入与货币资金勾稽", "收益率=利息收入/平均货币资金；偏差率=|收益率−1.5%|/1.5%", "利息收入、平均货币资金、对账单", "finance", calculateC7, LOWER_IS_BETTER([[0.3, 2], [0.8, 1], [Infinity, 0]]), "核对银行询证函与受限资金，识别存贷双虚。",
      (raw) => num(raw.finance.averageCashAndEquivalents) > 0),
    definition("D1", "D", "劳动仲裁/诉讼", "近24个月劳动仲裁与诉讼起数", "仲裁裁决与裁判文书", "public", calculateD1, LOWER_IS_BETTER([[0, 4], [1, 2], [3, 1], [Infinity, 0]]), "核查群体性劳动争议与赔付计提。",
      (raw) => has(raw.compliance.laborDisputeCount)),
    definition("D2", "D", "社保缴纳异常", "社保欠缴月数", "社保缴费记录", "public", calculateD2, LOWER_IS_BETTER([[0, 3], [2, 2], [6, 1], [Infinity, 0]]), "核查欠缴原因与补缴安排。",
      (raw) => has(raw.compliance.socialInsuranceOverdueMonths)),
    definition("D3", "D", "安全生产处罚", "近36个月安全生产处罚次数", "应急管理部门处罚记录", "public", calculateD3, LOWER_IS_BETTER([[0, 2], [Infinity, 0]]), "核查事故整改与安全投入。",
      (raw) => has(raw.compliance.safetyPenaltyCount)),
    definition("D4", "D", "欠薪舆情", "是否存在欠薪舆情或劳动监察通报", "舆情监测与监察通报", "public", calculateD4, LOWER_IS_BETTER([[0, 1], [Infinity, 0]]), "核查工资支付专户与欠薪化解情况。",
      () => true),
    definition("E1", "E", "控股股东质押率", "质押股份数/持股总数", "股权登记与质押公告", "credit", calculateE1, LOWER_IS_BETTER([[0.3, 5], [0.5, 3], [0.7, 1], [Infinity, 0]]), "核查平仓线、补充担保能力与控制权稳定性。",
      (raw) => has(raw.governance.pledgeRatio)),
    definition("E2", "E", "关联交易占比", "关联交易金额/营业收入", "关联方往来与交易合同", "finance", calculateE2, LOWER_IS_BETTER([[0.05, 3], [0.15, 2], [0.3, 1], [Infinity, 0]]), "核查关联交易定价公允性与资金去向。",
      (raw) => num(raw.operation.revenueCurrent) > 0),
    definition("E3", "E", "高管违规记录", "近36个月高管违规次数", "监管处罚与纪律处分", "public", calculateE3, LOWER_IS_BETTER([[0, 3], [1, 2], [2, 1], [Infinity, 0]]), "核查董监高履职与内控缺陷。",
      (raw) => has(raw.governance.executiveViolationCount)),
    definition("E4", "E", "审计意见类型", "标准无保留=1，带强调事项=0.75，保留=0.4，其他=0", "最近一期审计报告", "finance", calculateE4, HIGHER_IS_BETTER([[0.99, 2], [0.7, 1], [-Infinity, 0]]), "跟踪非标准审计事项整改。",
      () => true),
    definition("E5", "E", "信披违规记录", "近24个月信息披露违规次数", "问询函、纪律处分与整改公告", "public", calculateE5, LOWER_IS_BETTER([[0, 2], [1, 1], [Infinity, 0]]), "核查问询回复与整改落实。",
      (raw) => has(raw.governance.disclosureViolations))
  ]);

  // 数据缺失时按中性分处理（权重的50%），并标注置信度降级，避免“没数据反而满分”。
  const NEUTRAL_RATIO = 0.5;

  function evaluateMetric(item, rawData) {
    const missing = typeof item.available === "function" ? !item.available(rawData) : false;
    const computed = item.compute(rawData);
    const rawScore = scoreByBands(computed.value, item.bands);
    const score = missing ? fixed(item.weight * NEUTRAL_RATIO, 1) : rawScore;
    return {
      id: item.id,
      dimension: item.dimension,
      name: item.name,
      weight: item.weight,
      formula: item.formula,
      rawHint: item.rawHint,
      source: DATA_SOURCES[item.source] || "申报材料",
      value: computed.value,
      calculation: computed.calculation,
      rawSnapshot: computed.rawSnapshot,
      missing,
      score,
      scoring: item.bands.map((band) => {
        const key = ["lt", "lte", "gt", "gte"].find((name) => Object.prototype.hasOwnProperty.call(band, name));
        return `${key}:${band[key]}→${band.score}分`;
      }).join("；"),
      advice: missing ? "该指标所需数据未取得，已按中性分计，请补齐数据后重算。" : item.advice
    };
  }

  function evaluateVetoRules(rawData, metricMap) {
    const rules = VETO_RULES.filter((rule) => rule.test(rawData, metricMap)).map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description
    }));
    return { triggered: rules.length > 0, rules };
  }

  function resolveGrade(score, veto) {
    if (veto.triggered) {
      return {
        code: "veto",
        label: "不予绿色认定",
        risk: "高风险",
        conclusion: `触发${veto.rules.map((rule) => rule.id).join("、")}，总分${score}仅作参考。`
      };
    }
    if (score >= 85) return { code: "pass", label: "通过", risk: "低风险", conclusion: "总分≥85分且未触发一票否决，可进入常规审批流程。" };
    if (score >= 70) return { code: "conditional", label: "有条件通过", risk: "中风险", conclusion: "总分位于70—84分，需完成材料补充并落实限制性条款后放款。" };
    if (score >= 55) return { code: "prudent", label: "审慎通过", risk: "风险偏高", conclusion: "总分位于55—69分，需人工重点核查，暂不适用绿色利率优惠。" };
    return { code: "reject", label: "不予绿色认定", risk: "高风险", conclusion: "总分低于55分，绿色属性不足。" };
  }

  // 疑点清单：0分指标、数据缺失指标、以及得分率低于1/3的重点指标。
  function buildIssues(metrics) {
    return metrics
      .filter((metric) => {
        if (metric.missing && metric.weight >= 4) return true;
        if (metric.score === 0) return true;
        return metric.weight >= 4 && metric.score / metric.weight <= 0.34;
      })
      .map((metric, index) => {
        const ratio = metric.score / metric.weight;
        const severity = metric.missing ? "medium" : metric.score === 0 || ratio <= 0.2 ? "critical" : "medium";
        const title = metric.missing ? `${metric.name}（数据缺失）` : metric.score === 0 ? `${metric.name}严重异常` : `${metric.name}需关注`;
        return {
          number: index + 1,
          metricId: metric.id,
          title,
          conflict: metric.missing ? `${metric.rawSnapshot}；该项数据未取得，按中性分${metric.score}/${metric.weight}计` : `${metric.calculation}；分档：${metric.scoring}`,
          advice: metric.advice,
          severity,
          missing: Boolean(metric.missing)
        };
      });
  }

  function summarizeDimensions(metrics) {
    return Object.values(DIMENSIONS).map((dimension) => {
      const items = metrics.filter((metric) => metric.dimension === dimension.key);
      const score = items.reduce((total, metric) => total + metric.score, 0);
      const missingCount = items.filter((metric) => metric.missing).length;
      return { ...dimension, score: fixed(score, 1), ratio: safeDivide(score, dimension.weight), missingCount };
    });
  }

  // A 维度依赖用电与能耗数据，缺失时整体结论降级为“初步意见”。
  function buildConfidence(metrics) {
    const aMissing = metrics.filter((metric) => metric.dimension === "A" && metric.missing);
    const allMissing = metrics.filter((metric) => metric.missing);
    const coverage = 1 - allMissing.length / metrics.length;
    if (aMissing.length) {
      return {
        level: "降级",
        code: "downgraded",
        notes: ["A维度核心证据缺失，A维度结论降级为初步意见", `共${allMissing.length}项指标按中性分计`],
        coverage
      };
    }
    if (allMissing.length >= 3) {
      return { level: "中等", code: "partial", notes: [`共${allMissing.length}项指标数据缺失，已按中性分计`], coverage };
    }
    return { level: "完整", code: "full", notes: ["28项指标数据齐备，结论可复算"], coverage };
  }

  function evaluateEnterprise(rawData) {
    const metrics = METRIC_DEFINITIONS.map((item) => evaluateMetric(item, rawData));
    const metricMap = Object.fromEntries(metrics.map((metric) => [metric.id, metric]));
    const dimensions = summarizeDimensions(metrics);
    const totalScore = Math.max(0, Math.min(100, Math.round(metrics.reduce((total, metric) => total + metric.score, 0))));
    const veto = evaluateVetoRules(rawData, metricMap);
    return {
      enterpriseId: rawData.id,
      metrics,
      metricMap,
      dimensions,
      totalScore,
      veto,
      grade: resolveGrade(totalScore, veto),
      issues: buildIssues(metrics),
      confidence: buildConfidence(metrics)
    };
  }

  function validateRawData(rawData) {
    if (!rawData || !rawData.claims || !rawData.operation || !rawData.finance || !rawData.project) {
      return ["原始数据结构不完整，缺少申报声明或财务科目"];
    }
    const errors = [];
    if (!rawData.name) errors.push("企业名称不能为空");
    if (!(num(rawData.claims.investmentAmount) > 0)) errors.push("申报投资额必须大于0");
    const prior = rawData.operation.electricityPrior || [];
    const current = rawData.operation.electricityCurrent || [];
    if (prior.length !== 12 || current.length !== 12) errors.push("用电量必须完整录入24个月数据");
    prior.concat(current).forEach((value) => {
      if (!Number.isFinite(Number(value)) || Number(value) < 0) errors.push("用电量必须为不小于0的数字");
    });
    if (num(rawData.finance.totalAssets) <= 0) errors.push("资产总额必须大于0，否则无法计算资产负债率");
    if (num(rawData.finance.currentLiabilities) < 0) errors.push("流动负债不能为负数");
    return [...new Set(errors)];
  }

  return Object.freeze({
    DIMENSIONS,
    METRIC_WEIGHTS,
    METRIC_DEFINITIONS,
    VETO_RULES,
    DATA_SOURCES,
    LOAN_TYPES,
    scoreByBands,
    evaluateEnterprise,
    evaluateVetoRules,
    resolveGrade,
    validateRawData
  });
});
