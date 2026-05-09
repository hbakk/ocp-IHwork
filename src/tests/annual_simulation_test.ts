import type { EnergyProfilePoint } from "../core/models/profile.ts";
import { ocpBenguerirProjectConfig } from "../data/examples/ocp_benguerir_project.ts";
import { runAnnualSimulation } from "../core/services/annualSimulationService.ts";
import { buildHourlyTimestamps } from "../core/utils/time.ts";

const profile = generateSyntheticAnnualProfile();
const result = runAnnualSimulation(ocpBenguerirProjectConfig, profile, {
  expectedLength: 8760,
});

assert(profile.length === 8760, "Profile length must be 8760.");
assert(Math.abs(result.annualKpis.annualLoadMWh - 219000) < 1e-9, "Annual load must be 219000 MWh.");
assert(result.annualKpis.minimumSocPercent >= 10 - 1e-9, "SoC went below configured minimum.");
assert(result.annualKpis.maximumSocPercent <= 100 + 1e-9, "SoC exceeded configured maximum.");
assert(
  result.hourlyResults.every((step) => step.tariffPeriod !== "peak" || step.gridToBatteryMWh === 0),
  "Forbidden grid charging happened during peak hours.",
);
assert(
  result.hourlyResults.every((step) => step.tariffPeriod !== "full" || step.gridToBatteryMWh === 0),
  "Forbidden grid charging happened during full hours.",
);
assert(result.monthlyResults.length === 12, "Monthly aggregation must return 12 months.");

console.log("Annual simulation test passed.");
console.log(`Annual PV production: ${result.annualKpis.annualPVProductionMWh.toFixed(2)} MWh`);
console.log(`Annual load: ${result.annualKpis.annualLoadMWh.toFixed(2)} MWh`);
console.log(`Annual grid purchase: ${result.annualKpis.annualGridPurchaseMWh.toFixed(2)} MWh`);
console.log(`Annual battery discharge: ${result.annualKpis.annualBatteryDischargeMWh.toFixed(2)} MWh`);
console.log(`Annual wheeling: ${result.annualKpis.annualWheelingMWh.toFixed(2)} MWh`);
console.log(`Annual curtailment: ${result.annualKpis.annualCurtailmentMWh.toFixed(2)} MWh`);
console.log(`Annual net gain: ${result.annualKpis.annualNetGainDh.toFixed(2)} DH`);
console.log(`Min SoC: ${result.annualKpis.minimumSocPercent.toFixed(2)}%`);
console.log(`Equivalent cycles: ${result.annualKpis.bessEquivalentCycles.toFixed(2)}`);

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

