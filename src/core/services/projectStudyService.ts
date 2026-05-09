import type { AnnualKPI } from "../models/kpi.ts";
import type { ProjectStudyInput, ProjectStudyResult, ScenarioComparisonRow, ScenarioStudyResult } from "../models/study.ts";
import { validateProjectConfig } from "../utils/validation.ts";
import { validateHourlyProfile } from "./dataLoader.ts";
import { runAnnualScenarios } from "./scenarioService.ts";

const CLOSE_GAIN_THRESHOLD_PERCENT = 1;

export function runProjectStudy(input: ProjectStudyInput): ProjectStudyResult {
  const projectValidation = validateProjectConfig(input.projectConfig);
  if (!projectValidation.isValid) {
    throw new Error(`Invalid project configuration: ${projectValidation.errors.join(" ")}`);
  }

  const profileValidation = validateHourlyProfile(input.profile, {
    expectedLength: input.simulationOptions?.expectedLength ?? 8760,
    allowShortProfile: input.simulationOptions?.allowShortProfile,
    simulationStepMinutes: input.projectConfig.project.simulationStepMinutes,
  });

  if (!profileValidation.isValid) {
    throw new Error(`Invalid study profile: ${profileValidation.errors.join(" ")}`);
  }

  const scenarioResults: ScenarioStudyResult[] = runAnnualScenarios(
    input.projectConfig,
    input.profile,
    input.selectedScenarios,
    input.simulationOptions,
  ).map((scenarioResult) => ({
    scenarioId: scenarioResult.scenario.scenarioId,
    scenarioName: scenarioResult.scenario.scenarioName,
    result: scenarioResult.result,
    placeholder: scenarioResult.placeholder,
  }));

  const scenarioComparison = scenarioResults.map((scenarioResult) =>
    buildScenarioComparisonRow(scenarioResult.scenarioId, scenarioResult.scenarioName, scenarioResult.result.annualKpis),
  );
  const recommendedScenario = chooseRecommendedScenario(scenarioComparison);
  const warnings = [
    ...profileValidation.warnings.map((warning) => warning.message),
    ...scenarioResults.filter((result) => result.placeholder).map((result) => `${result.scenarioName} is a placeholder for future LP/MPC optimization.`),
  ];

  return {
    metadata: {
      studyId: `${input.projectConfig.project.projectId}-${Date.now()}`,
      studyName: `${input.projectConfig.project.projectName} project study`,
      projectId: input.projectConfig.project.projectId,
      projectName: input.projectConfig.project.projectName,
      clientName: input.projectConfig.project.clientName,
      siteName: input.projectConfig.project.siteName,
      currency: input.projectConfig.project.currency,
      profileHours: input.profile.length,
      simulationStepMinutes: input.projectConfig.project.simulationStepMinutes,
    },
    projectSummary: {
      projectId: input.projectConfig.project.projectId,
      projectName: input.projectConfig.project.projectName,
      clientName: input.projectConfig.project.clientName,
      siteName: input.projectConfig.project.siteName,
      country: input.projectConfig.project.country,
      sector: input.projectConfig.project.sector,
      pvCapacityMWp: input.projectConfig.pv.installedCapacityMWp,
      batteryPowerMW: input.projectConfig.battery.powerMW,
      batteryCapacityMWh: input.projectConfig.battery.capacityMWh,
    },
    scenarioResults,
    scenarioComparison,
    recommendedScenario,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}

export function buildScenarioComparisonRow(
  scenarioId: string,
  scenarioName: string,
  annualKpis: AnnualKPI,
): ScenarioComparisonRow {
  return {
    scenarioId,
    scenarioName,
    annualPVProductionMWh: annualKpis.annualPVProductionMWh,
    annualLoadMWh: annualKpis.annualLoadMWh,
    annualGridPurchaseMWh: annualKpis.annualGridPurchaseMWh,
    annualBatteryDischargeMWh: annualKpis.annualBatteryDischargeMWh,
    annualWheelingMWh: annualKpis.annualWheelingMWh,
    annualCurtailmentMWh: annualKpis.annualCurtailmentMWh,
    pvSelfConsumptionRatePercent: annualKpis.pvSelfConsumptionRatePercent,
    pvSelfSufficiencyRatePercent: annualKpis.pvSelfSufficiencyRatePercent,
    bessEquivalentCycles: annualKpis.bessEquivalentCycles,
    minSocPercent: annualKpis.minimumSocPercent,
    annualNetGainDh: annualKpis.annualNetGainDh,
    averageCostDhPerKWh: annualKpis.averageCostDhPerKWh,
    securityReserveViolationCount: annualKpis.securityReserveViolationCount,
  };
}

function chooseRecommendedScenario(rows: ScenarioComparisonRow[]): ScenarioComparisonRow | null {
  const candidates = rows.filter((row) => row.securityReserveViolationCount === 0);
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    const gainDelta = right.annualNetGainDh - left.annualNetGainDh;
    const closeThreshold = Math.max(Math.abs(left.annualNetGainDh), Math.abs(right.annualNetGainDh), 1) * (CLOSE_GAIN_THRESHOLD_PERCENT / 100);
    if (Math.abs(gainDelta) > closeThreshold) {
      return gainDelta;
    }
    return left.bessEquivalentCycles - right.bessEquivalentCycles;
  })[0];
}

