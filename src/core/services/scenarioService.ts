import type { BatterySystem } from "../models/battery.ts";
import type { EMSStrategy } from "../models/ems.ts";
import type { EnergyProfilePoint, AnnualSimulationResult } from "../models/profile.ts";
import type { ScenarioDefinition, SimulationResult, IndustrialEnergyProjectConfig } from "../models/scenario.ts";
import type { EnergyProfilePoint as LegacyProfilePoint } from "../utils/time.ts";
import { runAnnualSimulation, type AnnualSimulationOptions } from "./annualSimulationService.ts";
import { runEMSDispatch } from "./emsDispatchService.ts";

export const professionalScenarioDefinitions: ScenarioDefinition[] = [
  { scenarioId: "BASE_GRID_ONLY", scenarioName: "Base grid only", kind: "BASE_GRID_ONLY" },
  { scenarioId: "PV_ONLY", scenarioName: "PV only", kind: "PV_ONLY" },
  { scenarioId: "PV_BESS_BASIC", scenarioName: "PV + BESS basic EMS", kind: "PV_BESS_BASIC" },
  { scenarioId: "PV_BESS_GRID_OFFPEAK", scenarioName: "PV + BESS with off-peak grid charging", kind: "PV_BESS_GRID_OFFPEAK" },
  { scenarioId: "PV_BESS_WHEELING", scenarioName: "PV + BESS + wheeling", kind: "PV_BESS_WHEELING" },
  {
    scenarioId: "PV_BESS_OPTIMIZED_PLACEHOLDER",
    scenarioName: "PV + BESS optimized LP/MPC placeholder",
    kind: "PV_BESS_OPTIMIZED_PLACEHOLDER",
  },
];

export const defaultScenarioDefinitions = professionalScenarioDefinitions;

export interface ScenarioAnnualResult {
  scenario: ScenarioDefinition;
  result: AnnualSimulationResult;
  placeholder: boolean;
}

export function runAnnualScenario(
  projectConfig: IndustrialEnergyProjectConfig,
  profile: EnergyProfilePoint[],
  scenario: ScenarioDefinition,
  options: AnnualSimulationOptions = {},
): ScenarioAnnualResult {
  const scenarioConfig = buildScenarioConfig(projectConfig, scenario);
  const scenarioProfile = buildScenarioProfile(profile, scenario);

  return {
    scenario,
    result: runAnnualSimulation(scenarioConfig, scenarioProfile, {
      ...options,
      scenarioId: scenario.scenarioId,
      scenarioName: scenario.scenarioName,
    }),
    placeholder: scenario.kind === "PV_BESS_OPTIMIZED_PLACEHOLDER",
  };
}

export function runAnnualScenarios(
  projectConfig: IndustrialEnergyProjectConfig,
  profile: EnergyProfilePoint[],
  scenarios: ScenarioDefinition[] = professionalScenarioDefinitions,
  options: AnnualSimulationOptions = {},
): ScenarioAnnualResult[] {
  return scenarios.map((scenario) => runAnnualScenario(projectConfig, profile, scenario, options));
}

export function runScenarios(
  projectConfig: IndustrialEnergyProjectConfig,
  pvProfile: LegacyProfilePoint[],
  loadProfile: LegacyProfilePoint[],
  scenarios: ScenarioDefinition[] = professionalScenarioDefinitions,
): SimulationResult[] {
  return scenarios.map((scenario) => {
    const config = buildScenarioConfig(projectConfig, scenario);
    const scenarioPvProfile = scenario.kind === "BASE_GRID_ONLY"
      ? pvProfile.map((point) => ({ ...point, valueMWh: 0 }))
      : pvProfile;

    return runEMSDispatch(
      config,
      scenarioPvProfile,
      loadProfile,
      config.battery,
      config.tariff,
      config.emsStrategy,
      scenario.scenarioId,
      scenario.scenarioName,
    );
  });
}

function buildScenarioConfig(
  projectConfig: IndustrialEnergyProjectConfig,
  scenario: ScenarioDefinition,
): IndustrialEnergyProjectConfig {
  const clonedConfig = cloneProjectConfig(projectConfig);
  const strategy = buildScenarioStrategy(clonedConfig.emsStrategy, scenario);
  const battery = scenario.kind === "BASE_GRID_ONLY" || scenario.kind === "PV_ONLY"
    ? makeBypassBattery(clonedConfig.battery)
    : scenario.batteryOverride ?? clonedConfig.battery;

  return {
    ...clonedConfig,
    battery,
    emsStrategy: strategy,
  };
}

function buildScenarioStrategy(baseStrategy: EMSStrategy, scenario: ScenarioDefinition): EMSStrategy {
  const common: EMSStrategy = {
    ...baseStrategy,
    ...scenario.strategyOverride,
    strategyName: scenario.scenarioName,
    enableOptimizationFlag: false,
  };

  if (scenario.kind === "BASE_GRID_ONLY") {
    return {
      ...common,
      allowPvToLoad: false,
      allowPvToBattery: false,
      allowBatteryToLoad: false,
      allowGridToBatteryOffPeak: false,
      allowGridToBatteryFullHours: false,
      allowGridToBatteryPeakHours: false,
      allowWheeling: false,
      allowCurtailment: true,
    };
  }

  if (scenario.kind === "PV_ONLY") {
    return {
      ...common,
      allowPvToLoad: true,
      allowPvToBattery: false,
      allowBatteryToLoad: false,
      allowGridToBatteryOffPeak: false,
      allowGridToBatteryFullHours: false,
      allowGridToBatteryPeakHours: false,
      allowWheeling: scenario.strategyOverride?.allowWheeling ?? baseStrategy.allowWheeling,
      allowCurtailment: true,
    };
  }

  if (scenario.kind === "PV_BESS_GRID_OFFPEAK") {
    return {
      ...common,
      allowPvToLoad: true,
      allowPvToBattery: true,
      allowBatteryToLoad: true,
      allowGridToBatteryOffPeak: true,
      allowGridToBatteryFullHours: false,
      allowGridToBatteryPeakHours: false,
      allowWheeling: false,
      allowCurtailment: true,
    };
  }

  if (scenario.kind === "PV_BESS_WHEELING") {
    return {
      ...common,
      allowPvToLoad: true,
      allowPvToBattery: true,
      allowBatteryToLoad: true,
      allowGridToBatteryOffPeak: false,
      allowGridToBatteryFullHours: false,
      allowGridToBatteryPeakHours: false,
      allowWheeling: true,
      allowCurtailment: true,
    };
  }

  if (scenario.kind === "PV_BESS_OPTIMIZED_PLACEHOLDER") {
    return {
      ...common,
      allowPvToLoad: true,
      allowPvToBattery: true,
      allowBatteryToLoad: true,
      allowGridToBatteryOffPeak: baseStrategy.allowGridToBatteryOffPeak,
      allowGridToBatteryFullHours: false,
      allowGridToBatteryPeakHours: false,
      allowWheeling: baseStrategy.allowWheeling,
      allowCurtailment: true,
      enableOptimizationFlag: true,
    };
  }

  return {
    ...common,
    allowPvToLoad: true,
    allowPvToBattery: true,
    allowBatteryToLoad: true,
    allowGridToBatteryOffPeak: false,
    allowGridToBatteryFullHours: false,
    allowGridToBatteryPeakHours: false,
    allowWheeling: false,
    allowCurtailment: true,
  };
}

function buildScenarioProfile(profile: EnergyProfilePoint[], scenario: ScenarioDefinition): EnergyProfilePoint[] {
  if (scenario.kind !== "BASE_GRID_ONLY") {
    return profile;
  }

  return profile.map((point) => ({
    ...point,
    pvProductionMWh: 0,
  }));
}

function makeBypassBattery(referenceBattery: BatterySystem): BatterySystem {
  return {
    ...referenceBattery,
    powerMW: 0.000001,
    capacityMWh: 0.000001,
    minSocPercent: 0,
    maxSocPercent: 100,
    initialSocPercent: 0,
  };
}

function cloneProjectConfig(projectConfig: IndustrialEnergyProjectConfig): IndustrialEnergyProjectConfig {
  return {
    project: { ...projectConfig.project },
    site: {
      ...projectConfig.site,
      loadProfile: projectConfig.site.loadProfile?.map((point) => ({ ...point })),
    },
    pv: {
      ...projectConfig.pv,
      productionProfileMWh: projectConfig.pv.productionProfileMWh?.map((point) => ({ ...point })),
    },
    battery: { ...projectConfig.battery },
    tariff: {
      ...projectConfig.tariff,
      peakHours: projectConfig.tariff.peakHours.map((range) => ({ ...range })),
      fullHours: projectConfig.tariff.fullHours.map((range) => ({ ...range })),
      offPeakHours: projectConfig.tariff.offPeakHours.map((range) => ({ ...range })),
    },
    emsStrategy: { ...projectConfig.emsStrategy },
  };
}

