import type { EnergyProfilePoint } from "../core/models/profile.ts";
import { exportScenarioComparisonToCsv, exportStudySummaryToJson } from "../core/services/exportService.ts";
import { runProjectStudy } from "../core/services/projectStudyService.ts";
import { professionalScenarioDefinitions } from "../core/services/scenarioService.ts";
import { buildHourlyTimestamps } from "../core/utils/time.ts";
import { ocpBenguerirProjectConfig } from "../data/examples/ocp_benguerir_project.ts";

const profile = generateSyntheticAnnualProfile();
const studyResult = runProjectStudy({
  projectConfig: ocpBenguerirProjectConfig,
  profile,
  selectedScenarios: professionalScenarioDefinitions,
  simulationOptions: {
    expectedLength: 8760,
  },
  notes: "Synthetic project study test profile.",
});

const comparisonCsv = exportScenarioComparisonToCsv(studyResult.scenarioComparison);
const studyJson = exportStudySummaryToJson(studyResult);
const parsedJson = JSON.parse(studyJson) as { metadata?: unknown };

assert(studyResult.scenarioResults.length === professionalScenarioDefinitions.length, "All scenarios must return results.");
assert(studyResult.scenarioComparison.length === professionalScenarioDefinitions.length, "Comparison row count must match scenarios.");
assert(studyResult.recommendedScenario !== null, "Recommended scenario must not be empty.");
const recommendedScenario = studyResult.recommendedScenario;
if (recommendedScenario === null) {
  throw new Error("Recommended scenario must not be empty.");
}
assert(recommendedScenario.securityReserveViolationCount === 0, "Recommended scenario must not have security reserve violations.");
assert(comparisonCsv.includes("Scenario,Annual PV Production MWh"), "CSV export must contain expected headers.");
assert(parsedJson.metadata !== undefined, "JSON export must be valid and contain metadata.");

console.log("Project study test passed.");
console.table(
  studyResult.scenarioComparison.map((row) => ({
    scenario: row.scenarioId,
    gridMWh: Math.round(row.annualGridPurchaseMWh),
    dischargeMWh: Math.round(row.annualBatteryDischargeMWh),
    wheelingMWh: Math.round(row.annualWheelingMWh),
    gainDh: Math.round(row.annualNetGainDh),
    cycles: Math.round(row.bessEquivalentCycles * 10) / 10,
    minSoc: Math.round(row.minSocPercent * 10) / 10,
  })),
);
console.log(`Recommended scenario: ${recommendedScenario.scenarioId} - ${recommendedScenario.scenarioName}`);
console.log(`CSV export preview: ${comparisonCsv.split("\n")[0]}`);
console.log(`JSON export bytes: ${studyJson.length}`);

function generateSyntheticAnnualProfile(): EnergyProfilePoint[] {
  const timestamps = buildHourlyTimestamps("2025-01-01T00:00:00.000Z", 8760);
  return timestamps.map((timestamp, index) => {
    const date = new Date(timestamp);
    const hour = date.getUTCHours();
    const dayOfYear = Math.floor(index / 24);
    const seasonalFactor = 0.82 + 0.18 * Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI);
    const daylightShape = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const pvProductionMWh = Math.min(67, 58 * seasonalFactor * daylightShape);

    return {
      timestamp,
      pvProductionMWh,
      loadMWh: 25,
    };
  });
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
