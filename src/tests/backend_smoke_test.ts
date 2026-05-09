import { ocpBenguerirProjectConfig } from "../data/examples/ocp_benguerir_project.ts";
import { getOcpBenguerirSampleProfiles } from "../core/repositories/profileRepository.ts";
import { runEMSDispatch } from "../core/services/emsDispatchService.ts";
import { analyzePVProduction } from "../core/services/pvAnalysisService.ts";

const { pvProfile, loadProfile } = getOcpBenguerirSampleProfiles();

const result = runEMSDispatch(
  ocpBenguerirProjectConfig,
  pvProfile,
  loadProfile,
);

const pvAnalysis = analyzePVProduction(
  ocpBenguerirProjectConfig.pv,
  pvProfile,
  loadProfile,
  ocpBenguerirProjectConfig.project.simulationStepMinutes,
);

assert(result.hourlyResults.length === 48, "Expected 48 hourly results.");
assert(result.annualKpis.minimumSocPercent >= 10 - 1e-9, "SoC went below 10%.");
assert(result.annualKpis.maximumSocPercent <= 100 + 1e-9, "SoC exceeded 100%.");
assert(
  result.hourlyResults.every((step) => step.tariffPeriod !== "peak" || step.gridToBatteryMWh === 0),
  "Grid charging happened during peak hours.",
);
assert(
  result.hourlyResults.every((step) => step.tariffPeriod !== "full" || step.gridToBatteryMWh === 0),
  "Grid charging happened during full hours.",
);
assert(
  result.hourlyResults.every((step) => Math.abs(step.pvToLoadMWh - Math.min(step.pvProductionMWh, step.loadMWh)) < 1e-9),
  "PV was not used first for load.",
);
assert(
  result.hourlyResults.some((step) => step.tariffPeriod === "peak" && step.batteryToLoadMWh > 0),
  "Battery did not discharge during peak when available.",
);

console.log("Backend smoke test passed.");
console.log(`Project: ${ocpBenguerirProjectConfig.project.projectName}`);
console.log(`Sample hours: ${result.hourlyResults.length}`);
console.log(`Sample PV production: ${pvAnalysis.annualProductionMWh.toFixed(2)} MWh`);
console.log(`Grid purchase: ${result.annualKpis.gridPurchaseTotalMWh.toFixed(2)} MWh`);
console.log(`PV self-consumption: ${(result.annualKpis.pvSelfConsumptionRate * 100).toFixed(1)}%`);
console.log(`PV self-sufficiency: ${(result.annualKpis.pvSelfSufficiencyRate * 100).toFixed(1)}%`);
console.log(`BESS discharged: ${result.annualKpis.bessDischargedEnergyMWh.toFixed(2)} MWh`);
console.log(`Wheeling energy: ${result.annualKpis.wheelingEnergyMWh.toFixed(2)} MWh`);
console.log(`Net sample gain: ${result.economicSummary.netAnnualGain.toFixed(2)} DH`);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

