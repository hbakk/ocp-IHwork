import type { BatterySystem } from "../models/battery.ts";
import type { EMSStrategy } from "../models/ems.ts";
import type { GridTariff } from "../models/gridTariff.ts";
import type { IndustrialEnergyProjectConfig, MonthlyResult, SimulationResult } from "../models/scenario.ts";
import type { EnergyProfilePoint } from "../utils/time.ts";
import { getMonthKey } from "../utils/time.ts";
import { validateBattery, validateProfileLengths, validateProjectConfig } from "../utils/validation.ts";
import { simulateBatteryDispatch } from "./batterySimulationService.ts";
import { calculateEconomicSummary } from "./economicAnalysisService.ts";
import { calculateAnnualKpis } from "./kpiService.ts";

export function runEMSDispatch(
  projectConfig: IndustrialEnergyProjectConfig,
  pvProfile: EnergyProfilePoint[],
  loadProfile: EnergyProfilePoint[],
  battery: BatterySystem = projectConfig.battery,
  tariff: GridTariff = projectConfig.tariff,
  strategy: EMSStrategy = projectConfig.emsStrategy,
  scenarioId = "default",
  scenarioName = strategy.strategyName,
): SimulationResult {
  const validationErrors = [
    ...validateProjectConfig({ ...projectConfig, battery, tariff, emsStrategy: strategy }).errors,
    ...validateBattery(battery).errors,
    ...validateProfileLengths(pvProfile, loadProfile).errors,
  ];

  if (validationErrors.length > 0) {
    throw new Error(`Invalid EMS dispatch inputs: ${validationErrors.join(" ")}`);
  }

  const profile = pvProfile.map((pvPoint, index) => ({
    timestamp: pvPoint.timestamp,
    pvProductionMWh: pvPoint.valueMWh,
    loadMWh: loadProfile[index].valueMWh,
  }));

  const hourlyResults = simulateBatteryDispatch({
    profile,
    battery,
    tariff,
    strategy,
    simulationStepMinutes: projectConfig.project.simulationStepMinutes,
  });
  const economicSummary = calculateEconomicSummary(hourlyResults, tariff, battery);
  const annualKpis = calculateAnnualKpis(hourlyResults, battery, economicSummary);

  return {
    projectId: projectConfig.project.projectId,
    scenarioId,
    scenarioName,
    hourlyResults,
    monthlyResults: buildMonthlyResults(hourlyResults),
    annualKpis,
    economicSummary,
  };
}

function buildMonthlyResults(hourlyResults: SimulationResult["hourlyResults"]): MonthlyResult[] {
  const monthMap = new Map<string, MonthlyResult>();

  hourlyResults.forEach((step) => {
    const month = getMonthKey(step.timestamp);
    const row = monthMap.get(month) ?? {
      month,
      pvProductionMWh: 0,
      loadMWh: 0,
      gridPurchaseMWh: 0,
      batteryDischargeMWh: 0,
      wheelingMWh: 0,
      curtailedMWh: 0,
    };

    row.pvProductionMWh += step.pvProductionMWh;
    row.loadMWh += step.loadMWh;
    row.gridPurchaseMWh += step.gridToLoadMWh + step.gridToBatteryMWh;
    row.batteryDischargeMWh += step.batteryToLoadMWh;
    row.wheelingMWh += step.wheelingMWh;
    row.curtailedMWh += step.curtailedMWh;
    monthMap.set(month, row);
  });

  return Array.from(monthMap.values());
}

