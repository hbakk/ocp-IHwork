import type { BatterySystem } from "../models/battery.ts";
import type { GridTariff } from "../models/gridTariff.ts";
import type { DispatchStepResult, EconomicSummary } from "../models/scenario.ts";
import { getTariffDhPerKWh } from "../utils/time.ts";
import { mwhToKwh } from "../utils/units.ts";

export function calculateEconomicSummary(
  results: DispatchStepResult[],
  tariff: GridTariff,
  battery: BatterySystem,
): EconomicSummary {
  let costWithoutEMS = 0;
  let gridEnergyCost = 0;
  let baselinePeakGridMWh = 0;
  let actualPeakGridMWh = 0;
  let wheelingRevenue = 0;
  let curtailedValue = 0;
  let dischargedMWh = 0;

  results.forEach((step) => {
    const tariffDhPerKWh = getTariffDhPerKWh(step.timestamp, tariff);
    costWithoutEMS += mwhToKwh(step.loadMWh) * tariffDhPerKWh;
    gridEnergyCost += mwhToKwh(step.gridToLoadMWh + step.gridToBatteryMWh) * tariffDhPerKWh;
    wheelingRevenue += mwhToKwh(step.wheelingMWh) * (tariff.wheelingValueDhPerKWh ?? tariff.feedInTariffDhPerKWh ?? 0);
    curtailedValue += mwhToKwh(step.curtailedMWh) * (tariff.wheelingValueDhPerKWh ?? tariff.feedInTariffDhPerKWh ?? 0);
    dischargedMWh += step.batteryToLoadMWh;

    if (step.tariffPeriod === "peak") {
      baselinePeakGridMWh += step.loadMWh;
      actualPeakGridMWh += step.gridToLoadMWh;
    }
  });

  const batteryCyclingCost = mwhToKwh(dischargedMWh) * battery.cycleCostDhPerKWh;
  const costWithEMS = gridEnergyCost + batteryCyclingCost - wheelingRevenue;
  const avoidedGridCost = costWithoutEMS - gridEnergyCost;
  const peakAvoidedCost = mwhToKwh(Math.max(0, baselinePeakGridMWh - actualPeakGridMWh)) * tariff.peakTariffDhPerKWh;
  const suppliedKWh = mwhToKwh(results.reduce((sum, step) => sum + step.loadMWh, 0));

  return {
    costWithoutEMS,
    costWithEMS,
    gridEnergyCost,
    batteryCyclingCost,
    pvStorageCost: batteryCyclingCost,
    avoidedGridCost,
    peakAvoidedCost,
    wheelingRevenue,
    curtailmentLoss: curtailedValue,
    netAnnualGain: costWithoutEMS - costWithEMS,
    averageCostOfSuppliedEnergyDhPerKWh: suppliedKWh > 0 ? costWithEMS / suppliedKWh : 0,
  };
}

