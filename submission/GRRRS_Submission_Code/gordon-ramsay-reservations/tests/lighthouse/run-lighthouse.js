#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * run-lighthouse.js
 * ------------------
 * I run Lighthouse performance audits on the two highest-traffic pages
 * to verify they meet the PR-1 constraint: load within 3 seconds.
 *
 * Target pages (per SPM Project Charter / PR-1):
 *   1. Customer availability search page  - "/"
 *   2. Admin floor plan dashboard         - "/admin/dashboard"
 *
 * Usage:
 *   node tests/lighthouse/run-lighthouse.js
 *
 * Prerequisites:
 *   - Next.js dev server running on http://localhost:3000
 *   - lighthouse installed in devDependencies
 *
 * Jira: QDR-48 / Subtask 7.2
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "reports");
const PERF_THRESHOLD = 50; // Lighthouse performance score threshold (0-100)
const LCP_THRESHOLD_MS = 3000; // PR-1: load within 3 seconds

// Pages to audit
const PAGES = [
  {
    name: "customer-home",
    path: "/",
    label: "Customer Home (Availability Search)",
  },
  {
    name: "admin-dashboard",
    path: "/admin/dashboard",
    label: "Admin Dashboard (Floor Plan)",
  },
];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Runs Lighthouse on a single URL and returns the parsed JSON report.
 */
function runLighthouse(url, outputPath) {
  const cmd = [
    "npx lighthouse",
    `"${url}"`,
    "--quiet",
    "--output=json",
    `--output-path="${outputPath}"`,
    '--chrome-flags="--no-sandbox --headless --disable-gpu"',
    "--only-categories=performance",
    "--max-wait-for-load=15000",
  ].join(" ");

  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (err) {
    // Lighthouse exits non-zero on some score thresholds -- still parse output
    if (!fs.existsSync(outputPath)) {
      throw new Error(
        `Lighthouse failed to produce output for ${url}: ${err.message}`,
      );
    }
  }

  const raw = fs.readFileSync(outputPath, "utf8");
  return JSON.parse(raw);
}

/**
 * Extracts the metrics I care about from a Lighthouse report.
 */
function extractMetrics(report) {
  const audits = report.audits || {};
  const categories = report.categories || {};

  return {
    performanceScore: Math.round((categories.performance?.score ?? 0) * 100),
    lcp: Math.round(audits["largest-contentful-paint"]?.numericValue ?? 0),
    fcp: Math.round(audits["first-contentful-paint"]?.numericValue ?? 0),
    tbt: Math.round(audits["total-blocking-time"]?.numericValue ?? 0),
    cls: (audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3),
    tti: Math.round(audits["interactive"]?.numericValue ?? 0),
    si: Math.round(audits["speed-index"]?.numericValue ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let allPassed = true;
const results = [];

console.log("\n--- QDR-48 Lighthouse Performance Audit (PR-1) ---");
console.log(`Base URL : ${BASE_URL}`);
console.log(`PR-1 LCP threshold : ${LCP_THRESHOLD_MS}ms\n`);

for (const page of PAGES) {
  const url = `${BASE_URL}${page.path}`;
  const outputPath = path.join(OUTPUT_DIR, `${page.name}.json`);

  process.stdout.write(`Auditing: ${page.label} (${url}) ... `);

  let metrics;
  try {
    const report = runLighthouse(url, outputPath);
    metrics = extractMetrics(report);
    process.stdout.write("done\n");
  } catch (err) {
    process.stdout.write(`FAILED\n`);
    console.error(`  Error: ${err.message}`);
    allPassed = false;
    results.push({ page: page.label, url, error: err.message });
    continue;
  }

  const lcpPass = metrics.lcp <= LCP_THRESHOLD_MS;
  const perfPass = metrics.performanceScore >= PERF_THRESHOLD;
  const pagePass = lcpPass && perfPass;

  if (!pagePass) allPassed = false;

  console.log(
    `  Performance Score : ${metrics.performanceScore}/100  ${perfPass ? "PASS" : "FAIL (< " + PERF_THRESHOLD + ")"}`,
  );
  console.log(
    `  LCP               : ${metrics.lcp}ms  ${lcpPass ? "PASS" : "FAIL (> " + LCP_THRESHOLD_MS + "ms)"}`,
  );
  console.log(`  FCP               : ${metrics.fcp}ms`);
  console.log(`  TBT               : ${metrics.tbt}ms`);
  console.log(`  CLS               : ${metrics.cls}`);
  console.log(`  TTI               : ${metrics.tti}ms`);
  console.log(`  Speed Index       : ${metrics.si}ms`);
  console.log(`  Result            : ${pagePass ? "PASS" : "FAIL"}\n`);

  results.push({ page: page.label, url, metrics, pass: pagePass });
}

// Write summary JSON for the test execution log
const summaryPath = path.join(OUTPUT_DIR, "summary.json");
fs.writeFileSync(
  summaryPath,
  JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2),
);
console.log(`Report saved to: ${OUTPUT_DIR}`);
console.log(`\nOverall PR-1 result: ${allPassed ? "PASS" : "FAIL"}`);

process.exit(allPassed ? 0 : 1);
