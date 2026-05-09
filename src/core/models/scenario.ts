import type { BatterySystem } from "./battery.ts";
import type { EMSStrategy } from "./ems.ts";
import type { GridTariff } from "./gridTariff.ts";
import type { AnnualKPI } from "./kpi.ts";
import type { IndustrialEnergyProject } from "./project.ts";
import type { PVSystem } from "./pv.ts";
import type { SiteEnergyDemand } from "./site.ts";

export interface DispatchStepResult {
  timestamp: string;
  pvProductionMWh: number;
  loadMWh: number;
  pvToLoadMWh: number;
  pvToBatteryMWh: number;
  batteryToLoadMWh: number;
  gridToLoadMWh: number;
  gridToBatteryMWh: number;
  wheelingMWh: number;
  curtailedMWh: number;
  socMWh: number;
  socPercent: number;
  emsMode: string;
  tariffPeriod: string;
  warningFlags: string[];
}

export interface MonthlyResult {
  month: string;
  pvProductionMWh: number;
  loadMWh: number;
  gridPurchaseMWh: number;
  batteryDischargeMWh: number;
  wheelingMWh: number;
  curtailedMWh: number;
}

export interface EconomicSummary {
  costWithoutEMS: number;
  costWithEMS: number;
  gridEnergyCost: number;
  batteryCyclingCost: number;
  pvStorageCost: number;
  avoidedGridCost: number;
  peakAvoidedCost: number;
  wheelingRevenue: number;
  curtailmentLoss: number;
  netAnnualGain: number;
  averageCostOfSuppliedEnergyDhPerKWh: number;
}

export interface SimulationResult {
  projectId: string;
  scenarioId: string;
  scenarioName: string;
  hourlyResults: DispatchStepResult[];
  monthlyResults: MonthlyResult[];
  annualKpis: AnnualKPI;
  economicSummary: EconomicSummary;
}

export interface IndustrialEnergyProjectConfig {
  project: IndustrialEnergyProject;
  site: SiteEnergyDemand;
  pv: PVSystem;
  battery: BatterySystem;
  tariff: GridTariff;
  emsStrategy: EMSStrategy;
}

export type ScenarioKind =
  | "base_without_battery"
  | "pv_only"
  | "pv_bess_heuristic"
  | "pv_bess_off_peak_charging"
  | "pv_bess_wheeling"
  | "future_optimized_lp_mpc"
  | "BASE_GRID_ONLY"
  | "PV_ONLY"
  | "PV_BESS_BASIC"
  | "PV_BESS_GRID_OFFPEAK"
  | "PV_BESS_WHEELING"
  | "PV_BESS_OPTIMIZED_PLACEHOLDER";

export interface ScenarioDefinition {
  scenarioId: string;
  scenarioName: string;
  kind: ScenarioKind;
  batteryOverride?: BatterySystem;
  strategyOverride?: EMSStrategy;
}
