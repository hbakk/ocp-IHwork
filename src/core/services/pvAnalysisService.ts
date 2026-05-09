import type { PVSystem } from "../models/pv.ts";
import type { EnergyProfilePoint } from "../utils/time.ts";
import { getMonthKey } from "../utils/time.ts";

export interface PVAnalysisResult {
  annualProductionMWh: number;
  monthlyProductionMWh: Record<string, number>;
  dailyAverageProductionMWh: number;
  maxProductionMWh: number;
  capacityFactor: number;
  surplusBeforeBatteryMWh: number;
  directPvSelfConsumptionMWh: number;
}

export function analyzePVProduction(
  pvSystem: PVSystem,
  productionProfile: EnergyProfilePoint[],
  loadProfile: EnergyProfilePoint[],
  simulationStepMinutes: number,
): PVAnalysisResult {
  const monthlyProductionMWh: Record<string, number> = {};
  let annualProductionMWh = 0;
  let maxProductionMWh = 0;
  let surplusBeforeBatteryMWh = 0;
  let directPvSelfConsumptionMWh = 0;

  productionProfile.forEach((point, index) => {
    const production = point.valueMWh;
    const load = loadProfile[index]?.valueMWh ?? 0;
    const month = getMonthKey(point.timestamp);
    monthlyProductionMWh[month] = (monthlyProductionMWh[month] ?? 0) + production;
    annualProductionMWh += production;
    maxProductionMWh = Math.max(maxProductionMWh, production);
    directPvSelfConsumptionMWh += Math.min(production, load);
    surplusBeforeBatteryMWh += Math.max(0, production - load);
  });

  const stepHours = simulationStepMinutes / 60;
  const representedHours = productionProfile.length * stepHours;
  const representedDays = representedHours / 24;
  const theoreticalProductionMWh = pvSystem.installedCapacityMWp * representedHours;

  return {
    annualProductionMWh,
    monthlyProductionMWh,
    dailyAverageProductionMWh: representedDays > 0 ? annualProductionMWh / representedDays : 0,
    maxProductionMWh,
    capacityFactor: theoreticalProductionMWh > 0 ? annualProductionMWh / theoreticalProductionMWh : 0,
    surplusBeforeBatteryMWh,
    directPvSelfConsumptionMWh,
  };
}

