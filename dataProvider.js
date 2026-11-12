(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GreenCreditData = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  const BUILT_IN_ENTERPRISES = Object.freeze([
    {
      id: "green-source",
      reportCode: "LXS-LY-2026",
      shortName: "绿源新材",
      name: "绿源新材料科技有限公司",
      industry: "新材料制造",
      creditCode: "91320100MA27GX8K6R",
      region: "江苏省南京市",
      projectName: "年产 5 万吨再生高分子材料绿色改造项目",
      projectOverview: "建设再生高分子材料智能生产线，以节能挤出、余热回收和绿电采购为主要减排路径，申报材料与第三方核证基本自洽。",
      claims: {
        loanType: "project",
        emissionReductionRate: 26,
        investmentAmount: 5000,
        productionGrowthRate: 8,
        projectCategory: "节能降碳与资源循环利用",
        catalogCode: "C3.1.2",
        plannedProgress: 90,
        greenPowerRatioPrior: 18,
        greenPowerRatioCurrent: 27,
        projectLoanAmount: 2500,
        internalFundingAmount: 2500
      },
      operation: {
        electricityYearLabels: MONTH_LABELS,
        electricityPrior: [2200, 2140, 2090, 2040, 2010, 1980, 1950, 1920, 1900, 1880, 1860, 1840],
        electricityCurrent: [1800, 1780, 1760, 1740, 1710, 1680, 1650, 1620, 1590, 1560, 1530, 1500],
        energyIntensityPrior: 0.52,
        energyIntensityCurrent: 0.381,
        revenuePrior: 86000,
        revenueCurrent: 92880
      },
      project: {
        eiaApproved: true,
        eiaApprovalNo: "宁环建〔2025〕118号",
        eiaValidity: true,
        projectMatchesEia: true,
        energyAssessmentApproved: true,
        wastePermitHas: true,
        wastePermitValid: true,
        projectMatchesPermit: true,
        catalogMatched: true,
        matchedCoreProcesses: 5,
        coreProcesses: 6,
        verifiedReductionRate: 24.5,
        verificationReportHas: true,
        greenVoucherCount: 2,
        actualProgress: 92,
        projectPaidCash: 4600,
        assetIncreaseProject: 4600,
        projectCompletedAmount: 1350
      },
      finance: {
        cipPrior: 800,
        cipCurrent: 1450,
        fixedAssetsPrior: 12000,
        fixedAssetsCurrent: 13950,
        cashPaidForFixedAssets: 2730,
        totalAssets: 68000,
        totalLiabilities: 32640,
        industryDebtRatio: 52,
        currentAssets: 32000,
        currentLiabilities: 21000,
        operatingCashFlow: 6300,
        ebit: 6400,
        interestExpense: 320,
        netProfit: 4900,
        averageCashAndEquivalents: 12000,
        interestIncome: 180,
        relatedPartyTransactionAmount: 1800,
        auditOpinion: "unqualified"
      },
      compliance: {
        envPenaltyCount36m: 0,
        envPenaltyCount12m: 0,
        envPenaltyRelatedToProject: false,
        envLitigationStatus: "none",
        monitoringExceedances: 1,
        overdueRectifications: 0,
        environmentalCreditRating: "B",
        envNegativeNewsCount: 0,
        laborDisputeCount: 1,
        socialInsuranceOverdueMonths: 0,
        safetyPenaltyCount: 0,
        wageArrearNews: false
      },
      governance: {
        pledgeRatio: 18,
        controllerDishonesty: false,
        disclosureViolations: 0,
        executiveViolationCount: 0
      }
    },
    {
      id: "hengli-chemical",
      reportCode: "LXS-HL-2026",
      shortName: "恒力化工",
      name: "恒力化工股份有限公司",
      industry: "基础化工",
      creditCode: "91320100MA1Q6D8F2X",
      region: "江苏省南京市",
      projectName: "生产装置节能降碳综合改造项目",
      projectOverview: "宣称通过锅炉改造、热能梯级利用和自动化控制实现显著降碳，并申请绿色信贷利率优惠，但环评手续与用能数据均不支撑其声明。",
      claims: {
        loanType: "project",
        emissionReductionRate: 30,
        investmentAmount: 5000,
        productionGrowthRate: 5,
        projectCategory: "工业锅炉与热能系统节能改造",
        catalogCode: "C2.4.1",
        plannedProgress: 90,
        greenPowerRatioPrior: 7,
        greenPowerRatioCurrent: 5,
        projectLoanAmount: 3500,
        internalFundingAmount: 1500
      },
      operation: {
        electricityYearLabels: MONTH_LABELS,
        electricityPrior: [3010, 2980, 3050, 3120, 3190, 3260, 3320, 3380, 3440, 3490, 3550, 3610],
        electricityCurrent: [3380, 3430, 3510, 3640, 3710, 3820, 3910, 3990, 4070, 4140, 4210, 4300],
        energyIntensityPrior: 0.66,
        energyIntensityCurrent: 0.6732,
        revenuePrior: 128000,
        revenueCurrent: 125440
      },
      project: {
        eiaApproved: false,
        eiaApprovalNo: "",
        eiaValidity: false,
        projectMatchesEia: false,
        energyAssessmentApproved: false,
        wastePermitHas: true,
        wastePermitValid: true,
        projectMatchesPermit: true,
        catalogMatched: true,
        matchedCoreProcesses: 4,
        coreProcesses: 6,
        verifiedReductionRate: 27,
        verificationReportHas: false,
        greenVoucherCount: 0,
        actualProgress: 90,
        projectPaidCash: 820,
        assetIncreaseProject: 800,
        projectCompletedAmount: 1200
      },
      finance: {
        cipPrior: 1200,
        cipCurrent: 1440,
        fixedAssetsPrior: 26000,
        fixedAssetsCurrent: 27160,
        cashPaidForFixedAssets: 1480,
        totalAssets: 210000,
        totalLiabilities: 147000,
        industryDebtRatio: 55,
        currentAssets: 78000,
        currentLiabilities: 92000,
        operatingCashFlow: 4200,
        ebit: 5200,
        interestExpense: 3400,
        netProfit: 900,
        averageCashAndEquivalents: 14500,
        interestIncome: 196,
        relatedPartyTransactionAmount: 9200,
        auditOpinion: "unqualified"
      },
      compliance: {
        envPenaltyCount36m: 1,
        envPenaltyCount12m: 1,
        envPenaltyRelatedToProject: true,
        envLitigationStatus: "resolvedMinor",
        monitoringExceedances: 0,
        overdueRectifications: 0,
        environmentalCreditRating: "A",
        envNegativeNewsCount: 3,
        laborDisputeCount: 3,
        socialInsuranceOverdueMonths: 4,
        safetyPenaltyCount: 1,
        wageArrearNews: true
      },
      governance: {
        pledgeRatio: 42,
        controllerDishonesty: false,
        disclosureViolations: 0,
        executiveViolationCount: 1
      }
    },
    {
      id: "changtai-building",
      reportCode: "LXS-CT-2026",
      shortName: "昌泰建材",
      name: "昌泰绿色建材有限公司",
      industry: "绿色建材",
      creditCode: "91320100MA22T7M9K8",
      region: "江苏省南京市",
      projectName: "低碳混凝土生产线及固废利用项目",
      projectOverview: "采用工业固废替代部分水泥熟料，减排路径与绿色产业目录匹配，项目真实性较好，但资金勾稽与股权质押存在异常信号。",
      claims: {
        loanType: "project",
        emissionReductionRate: 18,
        investmentAmount: 3800,
        productionGrowthRate: 6,
        projectCategory: "工业固废综合利用",
        catalogCode: "C4.2.3",
        plannedProgress: 84,
        greenPowerRatioPrior: 12,
        greenPowerRatioCurrent: 19,
        projectLoanAmount: 2200,
        internalFundingAmount: 1600
      },
      operation: {
        electricityYearLabels: MONTH_LABELS,
        electricityPrior: [1820, 1800, 1790, 1780, 1760, 1750, 1740, 1730, 1720, 1710, 1700, 1690],
        electricityCurrent: [1750, 1730, 1710, 1690, 1660, 1640, 1610, 1590, 1560, 1530, 1500, 1480],
        energyIntensityPrior: 0.48,
        energyIntensityCurrent: 0.425,
        revenuePrior: 62000,
        revenueCurrent: 68200
      },
      project: {
        eiaApproved: true,
        eiaApprovalNo: "宁环建〔2025〕076号",
        eiaValidity: true,
        projectMatchesEia: true,
        energyAssessmentApproved: true,
        wastePermitHas: true,
        wastePermitValid: true,
        projectMatchesPermit: true,
        catalogMatched: true,
        matchedCoreProcesses: 3,
        coreProcesses: 5,
        verifiedReductionRate: 10.5,
        verificationReportHas: true,
        greenVoucherCount: 1,
        actualProgress: 88,
        projectPaidCash: 3380,
        assetIncreaseProject: 3380,
        projectCompletedAmount: 610
      },
      finance: {
        cipPrior: 980,
        cipCurrent: 1860,
        fixedAssetsPrior: 15200,
        fixedAssetsCurrent: 16580,
        cashPaidForFixedAssets: 3320,
        totalAssets: 88000,
        totalLiabilities: 57200,
        industryDebtRatio: 60,
        currentAssets: 30000,
        currentLiabilities: 24000,
        operatingCashFlow: 1100,
        ebit: 3800,
        interestExpense: 1900,
        netProfit: 1500,
        averageCashAndEquivalents: 7200,
        interestIncome: 8,
        relatedPartyTransactionAmount: 3800,
        auditOpinion: "unqualified"
      },
      compliance: {
        envPenaltyCount36m: 0,
        envPenaltyCount12m: 0,
        envPenaltyRelatedToProject: false,
        envLitigationStatus: "resolvedMinor",
        monitoringExceedances: 1,
        overdueRectifications: 0,
        environmentalCreditRating: "B",
        envNegativeNewsCount: 1,
        laborDisputeCount: 0,
        socialInsuranceOverdueMonths: 0,
        safetyPenaltyCount: 0,
        wageArrearNews: false
      },
      governance: {
        pledgeRatio: 82,
        controllerDishonesty: false,
        disclosureViolations: 0,
        executiveViolationCount: 0
      }
    },
    {
      id: "hongyuan-textile",
      reportCode: "LXS-HY-2026",
      shortName: "宏远纺织",
      name: "宏远纺织科技股份有限公司",
      industry: "纺织制造",
      creditCode: "91320100MA20N4P7Q3",
      region: "江苏省南京市",
      projectName: "印染废水余热回收与智能节能改造项目",
      projectOverview: "围绕印染环节余热回收、设备变频和能源管理系统建设，技术路线与申报目录一致，但治理与社会责任存在多项扣分。",
      claims: {
        loanType: "project",
        emissionReductionRate: 22,
        investmentAmount: 6500,
        productionGrowthRate: 14,
        projectCategory: "余热余压回收利用",
        catalogCode: "C1.3.5",
        plannedProgress: 88,
        greenPowerRatioPrior: 16,
        greenPowerRatioCurrent: 24,
        projectLoanAmount: 4000,
        internalFundingAmount: 2500
      },
      operation: {
        electricityYearLabels: MONTH_LABELS,
        electricityPrior: [2400, 2380, 2360, 2340, 2320, 2300, 2280, 2260, 2240, 2220, 2200, 2180],
        electricityCurrent: [2390, 2360, 2320, 2290, 2260, 2230, 2200, 2170, 2150, 2130, 2110, 2090],
        energyIntensityPrior: 0.57,
        energyIntensityCurrent: 0.5,
        revenuePrior: 84000,
        revenueCurrent: 89880
      },
      project: {
        eiaApproved: true,
        eiaApprovalNo: "宁环建〔2025〕103号",
        eiaValidity: true,
        projectMatchesEia: true,
        energyAssessmentApproved: true,
        wastePermitHas: true,
        wastePermitValid: true,
        projectMatchesPermit: true,
        catalogMatched: true,
        matchedCoreProcesses: 4,
        coreProcesses: 5,
        verifiedReductionRate: 18.5,
        verificationReportHas: true,
        greenVoucherCount: 1,
        actualProgress: 70,
        projectPaidCash: 6200,
        assetIncreaseProject: 6200,
        projectCompletedAmount: 700
      },
      finance: {
        cipPrior: 1100,
        cipCurrent: 1670,
        fixedAssetsPrior: 23800,
        fixedAssetsCurrent: 26500,
        cashPaidForFixedAssets: 3250,
        totalAssets: 120000,
        totalLiabilities: 81000,
        industryDebtRatio: 62,
        currentAssets: 40000,
        currentLiabilities: 41000,
        operatingCashFlow: 2600,
        ebit: 5200,
        interestExpense: 3600,
        netProfit: 1800,
        averageCashAndEquivalents: 10800,
        interestIncome: 159,
        relatedPartyTransactionAmount: 700,
        auditOpinion: "qualified"
      },
      compliance: {
        envPenaltyCount36m: 0,
        envPenaltyCount12m: 0,
        envPenaltyRelatedToProject: false,
        envLitigationStatus: "pendingMinor",
        monitoringExceedances: 0,
        overdueRectifications: 0,
        environmentalCreditRating: "B",
        envNegativeNewsCount: 2,
        laborDisputeCount: 1,
        socialInsuranceOverdueMonths: 8,
        safetyPenaltyCount: 0,
        wageArrearNews: false
      },
      governance: {
        pledgeRatio: 68,
        controllerDishonesty: false,
        disclosureViolations: 2,
        executiveViolationCount: 0
      }
    }
  ]);

  let runtimeCustomEnterprise = null;

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // 数据访问统一入口。未来接入真实数据库/征信接口时，只需替换本模块的实现，
  // 页面与指标层不需要感知数据来自内置 JSON、数据库还是外部接口。
  function getEnterpriseRawData(id) {
    if (id === "custom" && runtimeCustomEnterprise) {
      return deepClone(runtimeCustomEnterprise);
    }
    const enterprise = BUILT_IN_ENTERPRISES.find((item) => item.id === id);
    return enterprise ? deepClone(enterprise) : null;
  }

  function getEnterpriseCatalog() {
    const builtIns = BUILT_IN_ENTERPRISES.map((enterprise) => ({
      id: enterprise.id,
      reportCode: enterprise.reportCode,
      shortName: enterprise.shortName,
      name: enterprise.name,
      industry: enterprise.industry,
      region: enterprise.region,
      projectName: enterprise.projectName,
      projectOverview: enterprise.projectOverview,
      builtIn: true
    }));

    if (runtimeCustomEnterprise) {
      builtIns.push({
        id: "custom",
        reportCode: runtimeCustomEnterprise.reportCode,
        shortName: runtimeCustomEnterprise.shortName,
        name: runtimeCustomEnterprise.name,
        industry: runtimeCustomEnterprise.industry,
        region: runtimeCustomEnterprise.region,
        projectName: runtimeCustomEnterprise.projectName,
        projectOverview: runtimeCustomEnterprise.projectOverview,
        builtIn: false
      });
    }
    return deepClone(builtIns);
  }

  function registerCustomEnterprise(rawData) {
    runtimeCustomEnterprise = deepClone(rawData);
    runtimeCustomEnterprise.id = "custom";
    runtimeCustomEnterprise.reportCode = rawData.reportCode || `LXS-CUSTOM-${new Date().getFullYear()}`;
    return deepClone(runtimeCustomEnterprise);
  }

  function createBlankCustomTemplate() {
    const template = deepClone(BUILT_IN_ENTERPRISES[0]);
    template.id = "custom";
    template.reportCode = "";
    template.shortName = "";
    template.name = "";
    template.industry = "";
    template.creditCode = "";
    template.region = "江苏省南京市";
    template.projectName = "";
    template.projectOverview = "";
    template.claims = {
      loanType: "project",
      emissionReductionRate: 0,
      investmentAmount: 0,
      productionGrowthRate: 0,
      projectCategory: "",
      catalogCode: "",
      plannedProgress: 0,
      greenPowerRatioPrior: 0,
      greenPowerRatioCurrent: 0,
      projectLoanAmount: 0,
      internalFundingAmount: 0
    };
    template.operation = {
      electricityYearLabels: MONTH_LABELS,
      electricityPrior: Array(12).fill(0),
      electricityCurrent: Array(12).fill(0),
      energyIntensityPrior: 0,
      energyIntensityCurrent: 0,
      revenuePrior: 0,
      revenueCurrent: 0
    };
    template.project = {
      eiaApproved: false,
      eiaApprovalNo: "",
      eiaValidity: false,
      projectMatchesEia: false,
      energyAssessmentApproved: false,
      wastePermitHas: false,
      wastePermitValid: false,
      projectMatchesPermit: false,
      catalogMatched: false,
      matchedCoreProcesses: 0,
      coreProcesses: 0,
      verifiedReductionRate: 0,
      verificationReportHas: false,
      greenVoucherCount: 0,
      actualProgress: 0,
      projectPaidCash: 0,
      assetIncreaseProject: 0,
      projectCompletedAmount: 0
    };
    template.finance = {
      cipPrior: 0,
      cipCurrent: 0,
      fixedAssetsPrior: 0,
      fixedAssetsCurrent: 0,
      cashPaidForFixedAssets: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      industryDebtRatio: 60,
      currentAssets: 0,
      currentLiabilities: 0,
      operatingCashFlow: 0,
      ebit: 0,
      interestExpense: 0,
      netProfit: 0,
      averageCashAndEquivalents: 0,
      interestIncome: 0,
      relatedPartyTransactionAmount: 0,
      auditOpinion: "unqualified"
    };
    template.compliance = {
      envPenaltyCount36m: 0,
      envPenaltyCount12m: 0,
      envPenaltyRelatedToProject: false,
      envLitigationStatus: "none",
      monitoringExceedances: 0,
      overdueRectifications: 0,
      environmentalCreditRating: "B",
      envNegativeNewsCount: 0,
      laborDisputeCount: 0,
      socialInsuranceOverdueMonths: 0,
      safetyPenaltyCount: 0,
      wageArrearNews: false
    };
    template.governance = {
      pledgeRatio: 0,
      controllerDishonesty: false,
      disclosureViolations: 0,
      executiveViolationCount: 0
    };

    // 空白模板的数值字段统一留空（null），交给引擎按“数据缺失/中性分”处理，
    // 避免把 0 误当成已申报的真实值（例如“0 次处罚”反而拿满分）。
    [template.claims, template.operation, template.project, template.finance, template.compliance, template.governance].forEach((group) => {
      Object.keys(group).forEach((key) => {
        if (typeof group[key] === "number" && group[key] === 0) group[key] = null;
      });
    });
    template.operation.electricityPrior = Array(12).fill(null);
    template.operation.electricityCurrent = Array(12).fill(null);
    template.operation.electricityYearLabels = MONTH_LABELS;
    template.finance.industryDebtRatio = 60;
    return template;
  }

  return Object.freeze({
    MONTH_LABELS,
    getEnterpriseRawData,
    getEnterpriseCatalog,
    registerCustomEnterprise,
    createBlankCustomTemplate
  });
});
