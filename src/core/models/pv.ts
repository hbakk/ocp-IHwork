import type { EnergyProfilePoint } from "../utils/time.ts";

export interface PVSystem {
  installedCapacityMWp: number;
  inverterEfficiency: number;
  poiLossesPercent: number;
  degradationPercentPerYear: number;
  productionProfileMWh?: EnergyProfilePoint[];
  annualProductionMWh?: number;
  maxHourlyProductionMWh?: number;
  capacityFactor?: number;
}

