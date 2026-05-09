import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runOcpStudyFromCsv } from "../core/services/realDataStudyRunner.ts";

const inputPath = process.argv[2];

if (!inputPath) {
  console.log("Usage:");
  console.log("  node --experimental-strip-types src/scripts/run_ocp_csv_study.ts data/input/ocp_profile.csv");
  console.log("");
  console.log("Or with npm:");
  console.log("  npm run study:ocp-csv -- data/input/ocp_profile.csv");
  process.exit(0);
}

const resolvedInputPath = resolve(inputPath);
const csvText = readFileSync(resolvedInputPath, "utf-8");
const result = runOcpStudyFromCsv(csvText);
const comparisonPath = resolve("data/processed/ocp_scenario_comparison.csv");
const summaryPath = resolve("data/processed/ocp_study_summary.json");

mkdirSync(dirname(comparisonPath), { recursive: true });
writeFileSync(comparisonPath, result.scenarioComparisonCsv, "utf-8");
writeFileSync(summaryPath, result.studySummaryJson, "utf-8");

console.log(`OCP CSV study completed for ${resolvedInputPath}`);
console.log(`Rows: ${result.normalizedProfileSummary.rowCount}`);
console.log(`Total PV production: ${result.normalizedProfileSummary.totalPVProductionMWh.toFixed(2)} MWh`);
console.log(`Total load: ${result.normalizedProfileSummary.totalLoadMWh.toFixed(2)} MWh`);
console.log(`Recommended scenario: ${result.studyResult.recommendedScenario?.scenarioId ?? "none"}`);
console.log(`Wrote ${comparisonPath}`);
console.log(`Wrote ${summaryPath}`);

