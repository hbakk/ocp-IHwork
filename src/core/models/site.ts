import type { EnergyProfilePoint } from "../utils/time.ts";

export interface SiteEnergyDemand {
  loadProfile?: EnergyProfilePoint[];
  constantLoadMW?: number;
  annualConsumptionMWh?: number;
  peakLoadMW?: number;
  operatingHoursPerYear: number;
  criticalLoadMW: number;
  securityAutonomyMinutes: number;
}

