import type { AnnualSimulationResult, EnergyProfilePoint } from "../models/profile.ts";
import type { IndustrialEnergyProjectConfig } from "../models/scenario.ts";
import type { EnergyProfilePoint as LegacyProfilePoint } from "../utils/time.ts";
import { validateProjectConfig } from "../utils/validation.ts";
import { aggregateMonthlySimulationResults } from "./aggregationService.ts";
import { runEMSDispatch } from "./emsDispatchService.ts";
import { validateHourlyProfile, type CsvProfileOptions } from "./dataLoader.ts";

export interface AnnualSimulationOptions extends CsvProfileOptions {
  scenarioId?: string;
  scenarioName?: string;
}

export function runAnnualSimulation(
  projectConfig: IndustrialEnergyProjectConfig,
  profile: EnergyProfilePoint[],
  options: AnnualSimulationOptions = {},
): AnnualSimulationResult {
  const projectValidation = validateProjectConfig(projectConfig);
  if (!projectValidation.isValid) {
    throw new Error(`Invalid project configuration: ${projectValidation.errors.join(" ")}`);
  }

  const profileValidation = validateHourlyProfile(profile, {
    expectedLength: options.expectedLength ?? 8760,
    allowShortProfile: options.allowShortProfile,
    simulationStepMinutes: projectConfig.project.simulationStepMinutes,
  });

  if (!profileValidation.isValid) {
    throw new Error(`Invalid annual profile: ${profileValidation.errors.join(" ")}`);
  }

  const pvProfile = toLegacyProfile(profile, "pv");
  const loadProfile = toLegacyProfile(profile, "load");
  const dispatchResult = runEMSDispatch(
    projectConfig,
    pvProfile,
    loadProfile,
    projectConfig.battery,
    projectConfig.tariff,
    projectConfig.emsStrategy,
    options.scenarioId ?? "annual",
    options.scenarioName ?? "Annual EMS simulation",
  );

  return {
    projectId: projectConfig.project.projectId,
    profileValidation,
    hourlyResults: dispatchResult.hourlyResults,
    monthlyResults: aggregateMonthlySimulationResults(dispatchResult.hourlyResults, projectConfig.tariff),
    annualKpis: dispatchResult.annualKpis,
    economicSummary: dispatchResult.economicSummary,
  };
}

function toLegacyProfile(profile: EnergyProfilePoint[], kind: "pv" | "load"): LegacyProfilePoint[] {
  return profile.map((point) => ({
    timestamp: point.timestamp,
    valueMWh: kind === "pv" ? point.pvProductionMWh : point.loadMWh,
  }));
}

