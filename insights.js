(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GreenCreditInsights = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // 绿色贷款余额与同比增速（年末，本外币口径）。全部来自公开报道所引用的
  // 中国人民银行《金融机构贷款投向统计报告》，逐条见 SOURCES。
  const GREEN_LOAN = Object.freeze([
    { year: "2021", balance: 15.9, growth: 33.0 },
    { year: "2022", balance: 22.03, growth: 38.5 },
    { year: "2023", balance: 30.08, growth: 36.5 },
    { year: "2024", balance: 36.6, growth: 21.7 },
    { year: "2025", balance: 44.77, growth: 20.2 }
  ]);

  // 最新季度数据，用于说明“增速换挡”。
  const LATEST = Object.freeze({
    period: "2026 年三季度",
    balance: 49.22,
    growth: 13.0,
    increase: 4.41,
    totalLoanGrowth: 5.2,
    totalLoanPeriod: "2026 年二季度"
  });

  // 最高人民法院《中国环境资源审判（2025）》：2025 年审结环境资源一审案件结构。
  const JUSTICE = Object.freeze({
    year: 2025,
    total: 22.9,
    criminal: 2.4,
    civil: 16.4,
    admin: 4.1,
    publicInterest: 3530,
    compensation2024: 96,
    compensationGrowth: 87.5
  });

  const SOURCES = Object.freeze([
    {
      group: "绿色贷款余额与增速",
      date: "2022-01-31",
      label: "人民网：2021 年末本外币绿色贷款余额 15.9 万亿元，同比增 33%",
      url: "http://finance.people.com.cn/BIG5/n1/2022/0131/c1004-32344219.html"
    },
    {
      group: "绿色贷款余额与增速",
      date: "2023-02-03",
      label: "中国政府网/新华社：2022 年末绿色贷款余额 22.03 万亿元，同比增 38.5%",
      url: "https://www.gov.cn/xinwen/2023-02/03/content_5739953.htm"
    },
    {
      group: "绿色贷款余额与增速",
      date: "2024-04-18",
      label: "经济日报：2023 年末绿色贷款余额 30.08 万亿元，同比增 36.5%",
      url: "http://paper.ce.cn/pad/content/202404/18/content_293127.html"
    },
    {
      group: "绿色贷款余额与增速",
      date: "2025-02-19",
      label: "人民日报：2024 年末绿色贷款余额 36.6 万亿元，同比增 21.7%",
      url: "http://finance.people.com.cn/BIG5/n1/2025/0219/c1004-40421108.html"
    },
    {
      group: "绿色贷款余额与增速",
      date: "2026-01-28",
      label: "人民日报：2025 年末绿色贷款余额 44.77 万亿元，同比增 20.2%",
      url: "https://paper.people.com.cn/rmrb/pc/content/202601/28/content_30136228.html"
    },
    {
      group: "最新季度数据",
      date: "2026-07-29",
      label: "经济参考报：2026 年二季度末绿色贷款 48.63 万亿元，各项贷款同比增 5.2%",
      url: "https://jrj.wuhan.gov.cn/ztzl_57/xyrd/yxy/202607/t20260729_2826624.shtml"
    },
    {
      group: "最新季度数据",
      date: "2026-11-03",
      label: "经济日报：2026 年三季度末绿色贷款 49.22 万亿元，同比增 13.0%",
      url: "http://paper.ce.cn/pad/content/202611/03/content_341301.html"
    },
    {
      group: "环境司法",
      date: "2026-06-05",
      label: "最高人民法院《中国环境资源审判（2025）》：2025 年审结环境资源一审案件 22.9 万件",
      url: "https://www.court.gov.cn/zixun/xiangqing/502011.html"
    },
    {
      group: "环境司法",
      date: "2025-06-05",
      label: "最高人民法院《中国环境资源审判（2024）》：判令生态环境损害赔偿资金 96 亿元，同比增 87.5%",
      url: "http://www.chinatrial.net.cn/news/32557.html"
    }
  ]);

  return Object.freeze({ GREEN_LOAN, LATEST, JUSTICE, SOURCES });
});
