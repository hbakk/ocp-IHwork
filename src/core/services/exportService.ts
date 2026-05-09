import type { MonthlyEnergySummary } from "../models/profile.ts";
import type { DispatchStepResult } from "../models/scenario.ts";
import type { ProjectStudyResult, ScenarioComparisonRow } from "../models/study.ts";

const comparisonHeaders = [
  "Scenario",
  "Annual PV Production MWh",
  "Annual Load MWh",
  "Grid Purchase MWh",
  "Battery Discharge MWh",
  "Wheeling MWh",
  "Curtailment MWh",
  "PV Self Consumption %",
  "PV Self Sufficiency %",
  "Equivalent Cycles",
  "Min SoC %",
  "Annual Net Gain DH",
  "Average Cost DH/kWh",
  "Security Violations",
];

export function exportScenarioComparisonToCsv(comparisonRows: ScenarioComparisonRow[]): string {
  const rows = comparisonRows.map((row) => [
    row.scenarioName,
    row.annualPVProductionMWh,
    row.annualLoadMWh,
    row.annualGridPurchaseMWh,
    row.annualBatteryDischargeMWh,
    row.annualWheelingMWh,
    row.annualCurtailmentMWh,
    row.pvSelfConsumptionRatePercent,
    row.pvSelfSufficiencyRatePercent,
    row.bessEquivalentCycles,
    row.minSocPercent,
    row.annualNetGainDh,
    row.averageCostDhPerKWh,
    row.securityReserveViolationCount,
  ]);

  return toCsv([comparisonHeaders, ...rows]);
}

export function exportMonthlyResultsToCsv(monthlyResults: MonthlyEnergySummary[]): string {
  return toCsv([
    [
      "Month",
      "PV Production MWh",
      "Load MWh",
      "PV To Load MWh",
      "PV To Battery MWh",
      "Battery To Load MWh",
      "Grid To Load MWh",
      "Grid To Battery MWh",
      "Wheeling MWh",
      "Curtailment MWh",
      "Average SoC %",
      "Min SoC %",
      "Max SoC %",
      "Estimated Cost DH",
      "Estimated Gain DH",
    ],
    ...monthlyResults.map((row) => [
      row.month,
      row.pvProductionMWh,
      row.loadMWh,
      row.pvToLoadMWh,
      row.pvToBatteryMWh,
      row.batteryToLoadMWh,
      row.gridToLoadMWh,
      row.gridToBatteryMWh,
      row.wheelingMWh,
      row.curtailedMWh,
      row.averageSocPercent,
      row.minSocPercent,
      row.maxSocPercent,
      row.estimatedCostDh,
      row.estimatedGainDh,
    ]),
  ]);
}

export function exportHourlyDispatchToCsv(hourlyResults: DispatchStepResult[]): string {
  return toCsv([
    [
      "Timestamp",
      "PV Production MWh",
      "Load MWh",
      "PV To Load MWh",
      "PV To Battery MWh",
      "Battery To Load MWh",
      "Grid To Load MWh",
      "Grid To Battery MWh",
      "Wheeling MWh",
      "Curtailment MWh",
      "SoC MWh",
      "SoC %",
      "EMS Mode",
      "Tariff Period",
      "Warnings",
    ],
    ...hourlyResults.map((row) => [
      row.timestamp,
      row.pvProductionMWh,
      row.loadMWh,
      row.pvToLoadMWh,
      row.pvToBatteryMWh,
      row.batteryToLoadMWh,
      row.gridToLoadMWh,
      row.gridToBatteryMWh,
      row.wheelingMWh,
      row.curtailedMWh,
      row.socMWh,
      row.socPercent,
      row.emsMode,
      row.tariffPeriod,
      row.warningFlags.join("|"),
    ]),
  ]);
}

export function exportStudySummaryToJson(studyResult: ProjectStudyResult): string {
  return JSON.stringify(
    {
      metadata: studyResult.metadata,
      projectSummary: studyResult.projectSummary,
      scenarioComparison: studyResult.scenarioComparison,
      recommendedScenario: studyResult.recommendedScenario,
      warnings: studyResult.warnings,
      generatedAt: studyResult.generatedAt,
    },
    null,
    2,
  );
}

function toCsv(rows: Array<Array<string | number>>): string {
  return rows.map((row) => row.map(formatCsvCell).join(",")).join("\n");
}

function formatCsvCell(value: string | number): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(roundForExport(value)) : "";
  }

  const escaped = value.replace(/"/g, '""');
  return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"') ? `"${escaped}"` : escaped;
}

function roundForExport(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

