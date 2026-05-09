import type { DispatchStepResult } from "./scenario.ts";

export interface EnergyProfilePoint {
  timestamp: string;
  pvProductionMWh: number;
  loadMWh: number;
}

export interface EnergyProfile {
  projectId?: string;
  profileName: string;
  simulationStepMinutes: number;
  points: EnergyProfilePoint[];
}

export interface ProfileValidationWarning {
  code: string;
  message: string;
}

export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: ProfileValidationWarning[];
}

export interface MonthlyEnergySummary {
  month: string;
  pvProductionMWh: number;
  loadMWh: number;
  pvToLoadMWh: number;
  pvToBatteryMWh: number;
  batteryToLoadMWh: number;
  gridToLoadMWh: number;
  gridToBatteryMWh: number;
  wheelingMWh: number;
  curtailedMWh: number;
  averageSocPercent: number;
  minSocPercent: number;
  maxSocPercent: number;
  estimatedCostDh: number;
  estimatedGainDh: number;
}

export type HourlySimulationProfile = EnergyProfilePoint[];

export interface AnnualSimulationResult {
  projectId: string;
  profileValidation: ProfileValidationResult;
  hourlyResults: DispatchStepResult[];
  monthlyResults: MonthlyEnergySummary[];
  annualKpis: import("./kpi.ts").AnnualKPI;
  economicSummary: import("./scenario.ts").EconomicSummary;
}

