export interface BatterySystem {
  powerMW: number;
  capacityMWh: number;
  minSocPercent: number;
  maxSocPercent: number;
  initialSocPercent: number;
  roundTripEfficiency: number;
  availabilityPercent: number;
  maxCyclesPerYear: number;
  cycleCostDhPerKWh: number;
  lifetimeYears: number;
  degradationPercentPerYear: number;
}

