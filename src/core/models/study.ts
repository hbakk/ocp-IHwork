import type { AnnualKPI } from "./kpi.ts";
import type { AnnualSimulationResult, EnergyProfilePoint, MonthlyEnergySummary } from "./profile.ts";
import type { ScenarioDefinition } from "./scenario.ts";
import type { DispatchStepResult, EconomicSummary, IndustrialEnergyProjectConfig } from "./scenario.ts";
import type { AnnualSimulationOptions } from "../services/annualSimulationService.ts";

export interface StudyMetadata {
  studyId: string;
  studyName: string;
  projectId: string;
  projectName: string;
  clientName: string;
  siteName: string;
  currency: string;
  profileHours: number;
  simulationStepMinutes: number;
}

export interface ProjectStudyInput {
  projectConfig: IndustrialEnergyProjectConfig;
  profile: EnergyProfilePoint[];
  selectedScenarios: ScenarioDefinition[];
  simulationOptions?: AnnualSimulationOptions;
  notes?: string;
}

export interface ScenarioStudyResult {
  scenarioId: string;
  scenarioName: string;
  result: AnnualSimulationResult;
  placeholder: boolean;
}

export interface ScenarioComparisonRow {
  scenarioId: string;
  scenarioName: string;
  annualPVProductionMWh: number;
  annualLoadMWh: number;
  annualGridPurchaseMWh: number;
  annualBatteryDischargeMWh: number;
  annualWheelingMWh: number;
  annualCurtailmentMWh: number;
  pvSelfConsumptionRatePercent: number;
  pvSelfSufficiencyRatePercent: number;
  bessEquivalentCycles: number;
  minSocPercent: number;
  annualNetGainDh: number;
  averageCostDhPerKWh: number;
  securityReserveViolationCount: number;
}

export interface ProjectStudyResult {
  metadata: StudyMetadata;
  projectSummary: {
    projectId: string;
    projectName: string;
    clientName: string;
    siteName: string;
    country: string;
    sector: string;
    pvCapacityMWp: number;
    batteryPowerMW: number;
    batteryCapacityMWh: number;
  };
  scenarioResults: ScenarioStudyResult[];
  scenarioComparison: ScenarioComparisonRow[];
  recommendedScenario: ScenarioComparisonRow | null;
  warnings: string[];
  generatedAt: string;
}

export interface ExportableStudyReport {
  metadata: StudyMetadata;
  comparison: ScenarioComparisonRow[];
  recommendedScenario: ScenarioComparisonRow | null;
  annualKpisByScenario: Record<string, AnnualKPI>;
  economicsByScenario: Record<string, EconomicSummary>;
  monthlyResultsByScenario: Record<string, MonthlyEnergySummary[]>;
  hourlyResultsByScenario?: Record<string, DispatchStepResult[]>;
}

