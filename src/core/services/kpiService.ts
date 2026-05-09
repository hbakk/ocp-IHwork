import type { BatterySystem } from "../models/battery.ts";
import type { AnnualKPI } from "../models/kpi.ts";
import type { DispatchStepResult, EconomicSummary } from "../models/scenario.ts";

export function calculateAnnualKpis(
  results: DispatchStepResult[],
  battery: BatterySystem,
  economicSummary: EconomicSummary,
): AnnualKPI {
  const totals = results.reduce(
    (accumulator, step) => {
      accumulator.pv += step.pvProductionMWh;
      accumulator.load += step.loadMWh;
      accumulator.pvToLoad += step.pvToLoadMWh;
      accumulator.pvToBattery += step.pvToBatteryMWh;
      accumulator.batteryToLoad += step.batteryToLoadMWh;
      accumulator.grid += step.gridToLoadMWh + step.gridToBatteryMWh;
      accumulator.wheeling += step.wheelingMWh;
      accumulator.curtailed += step.curtailedMWh;
      if (step.tariffPeriod === "peak") {
        accumulator.peakBatteryDischarge += step.batteryToLoadMWh;
      }
      return accumulator;
    },
    {
      pv: 0,
      load: 0,
      pvToLoad: 0,
      pvToBattery: 0,
      batteryToLoad: 0,
      grid: 0,
      wheeling: 0,
      curtailed: 0,
      peakBatteryDischarge: 0,
    },
  );

  let emsModeSwitches = 0;
  for (let index = 1; index < results.length; index += 1) {
    if (results[index].emsMode !== results[index - 1].emsMode) emsModeSwitches += 1;
  }

  const socValues = results.map((step) => step.socPercent);
  const reserveViolations = results.filter((step) => step.socPercent < battery.minSocPercent - 1e-9).length;
  const batteryChargeMWh = totals.pvToBattery + results.reduce((sum, step) => sum + step.gridToBatteryMWh, 0);
  const gridPurchaseMWh = totals.grid;
  const selfConsumptionRate = totals.pv > 0 ? (totals.pvToLoad + totals.pvToBattery) / totals.pv : 0;
  const selfSufficiencyRate = totals.load > 0 ? (totals.pvToLoad + totals.batteryToLoad) / totals.load : 0;
  const equivalentCycles = battery.capacityMWh > 0 ? totals.batteryToLoad / battery.capacityMWh : 0;

  return {
    annualPVProductionMWh: totals.pv,
    annualLoadMWh: totals.load,
    annualGridPurchaseMWh: gridPurchaseMWh,
    annualBatteryChargeMWh: batteryChargeMWh,
    annualBatteryDischargeMWh: totals.batteryToLoad,
    annualWheelingMWh: totals.wheeling,
    annualCurtailmentMWh: totals.curtailed,
    pvSelfConsumptionRatePercent: selfConsumptionRate * 100,
    pvSelfSufficiencyRatePercent: selfSufficiencyRate * 100,
    bessEquivalentCycles: equivalentCycles,
    securityReserveViolationCount: reserveViolations,
    averageCostDhPerKWh: economicSummary.averageCostOfSuppliedEnergyDhPerKWh,
    annualNetGainDh: economicSummary.netAnnualGain,
    pvSelfConsumptionRate: selfConsumptionRate,
    pvSelfSufficiencyRate: selfSufficiencyRate,
    bessChargedEnergyMWh: batteryChargeMWh,
    bessDischargedEnergyMWh: totals.batteryToLoad,
    gridPurchaseTotalMWh: gridPurchaseMWh,
    peakGridPurchaseAvoidedMWh: totals.peakBatteryDischarge,
    annualEconomicGainDh: economicSummary.netAnnualGain,
    minimumSocPercent: Math.min(...socValues),
    maximumSocPercent: Math.max(...socValues),
    equivalentBatteryCycles: equivalentCycles,
    curtailmentRate: totals.pv > 0 ? totals.curtailed / totals.pv : 0,
    wheelingEnergyMWh: totals.wheeling,
    bessAvailabilityPercent: battery.availabilityPercent,
    securityReserveViolations: reserveViolations,
    emsModeSwitches,
  };
}
