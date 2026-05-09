import type { GridTariff } from "../models/gridTariff.ts";
import type { MonthlyEnergySummary } from "../models/profile.ts";
import type { DispatchStepResult } from "../models/scenario.ts";
import { getMonthKey, getTariffDhPerKWh } from "../utils/time.ts";
import { mwhToKwh } from "../utils/units.ts";

interface MutableMonthlyEnergySummary extends MonthlyEnergySummary {
  socSampleCount: number;
}

export function aggregateMonthlySimulationResults(
  hourlyResults: DispatchStepResult[],
  tariff: GridTariff,
): MonthlyEnergySummary[] {
  const monthMap = new Map<string, MutableMonthlyEnergySummary>();

  hourlyResults.forEach((step) => {
    const month = getMonthKey(step.timestamp);
    const current = monthMap.get(month) ?? createEmptyMonth(month);
    const tariffDhPerKWh = getTariffDhPerKWh(step.timestamp, tariff);
    const gridEnergyMWh = step.gridToLoadMWh + step.gridToBatteryMWh;
    const wheelingValueDhPerKWh = tariff.wheelingValueDhPerKWh ?? tariff.feedInTariffDhPerKWh ?? 0;
    const baselineCostDh = mwhToKwh(step.loadMWh) * tariffDhPerKWh;
    const actualEnergyCostDh = mwhToKwh(gridEnergyMWh) * tariffDhPerKWh;
    const wheelingRevenueDh = mwhToKwh(step.wheelingMWh) * wheelingValueDhPerKWh;

    current.pvProductionMWh += step.pvProductionMWh;
    current.loadMWh += step.loadMWh;
    current.pvToLoadMWh += step.pvToLoadMWh;
    current.pvToBatteryMWh += step.pvToBatteryMWh;
    current.batteryToLoadMWh += step.batteryToLoadMWh;
    current.gridToLoadMWh += step.gridToLoadMWh;
    current.gridToBatteryMWh += step.gridToBatteryMWh;
    current.wheelingMWh += step.wheelingMWh;
    current.curtailedMWh += step.curtailedMWh;
    current.averageSocPercent += step.socPercent;
    current.minSocPercent = Math.min(current.minSocPercent, step.socPercent);
    current.maxSocPercent = Math.max(current.maxSocPercent, step.socPercent);
    current.estimatedCostDh += actualEnergyCostDh - wheelingRevenueDh;
    current.estimatedGainDh += baselineCostDh - actualEnergyCostDh + wheelingRevenueDh;
    current.socSampleCount += 1;

    monthMap.set(month, current);
  });

  return Array.from(monthMap.values()).map(({ socSampleCount, ...month }) => ({
    ...month,
    averageSocPercent: socSampleCount > 0 ? month.averageSocPercent / socSampleCount : 0,
    minSocPercent: Number.isFinite(month.minSocPercent) ? month.minSocPercent : 0,
    maxSocPercent: Number.isFinite(month.maxSocPercent) ? month.maxSocPercent : 0,
  }));
}

function createEmptyMonth(month: string): MutableMonthlyEnergySummary {
  return {
    month,
    pvProductionMWh: 0,
    loadMWh: 0,
    pvToLoadMWh: 0,
    pvToBatteryMWh: 0,
    batteryToLoadMWh: 0,
    gridToLoadMWh: 0,
    gridToBatteryMWh: 0,
    wheelingMWh: 0,
    curtailedMWh: 0,
    averageSocPercent: 0,
    minSocPercent: Infinity,
    maxSocPercent: -Infinity,
    estimatedCostDh: 0,
    estimatedGainDh: 0,
    socSampleCount: 0,
  };
}

