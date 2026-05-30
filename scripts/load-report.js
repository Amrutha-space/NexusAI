import fs from "node:fs";

const summaryPath = "tests/load/last-summary.json";
const reportPath = "tests/load/RESULTS.md";

if (!fs.existsSync(summaryPath)) {
  console.error(`Missing ${summaryPath}. Run a k6 profile first.`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const row = {
  profile: summary.profile || process.env.PROFILE || "mixed",
  requests: Math.round(summary.iterations || 0),
  rps: "see k6 stdout",
  p95: `${Number(summary.httpReqDurationP95 || 0).toFixed(1)} ms`,
  p99: `${Number(summary.httpReqDurationP99 || 0).toFixed(1)} ms`,
  errorRate: `${(Number(summary.status5xxRate || 0) * 100).toFixed(2)}%`,
  rate429: `${(Number(summary.status429Rate || 0) * 100).toFixed(2)}%`
};

const line = `| ${row.profile} | ${row.requests} | ${row.rps} | ${row.p95} | ${row.p99} | ${row.errorRate} | ${row.rate429} | captured from last-summary.json |`;
const report = fs.readFileSync(reportPath, "utf8");
const placeholder = `| ${row.profile} |  |  |  |  |  |  |  |`;
const updated = report.includes(placeholder) ? report.replace(placeholder, line) : report;

fs.writeFileSync(reportPath, updated.includes(line) ? updated : `${report}\n\nLatest captured row:\n\n${line}\n`);
console.log(line);
