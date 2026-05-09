export interface EMSStrategy {
  strategyName: string;
  allowPvToLoad: boolean;
  allowPvToBattery: boolean;
  allowBatteryToLoad: boolean;
  allowGridToBatteryOffPeak: boolean;
  allowGridToBatteryFullHours: boolean;
  allowGridToBatteryPeakHours: boolean;
  allowWheeling: boolean;
  allowCurtailment: boolean;
  enableWeatherForecastFlag: boolean;
  enableAdaptiveSocFlag: boolean;
  enableRampRateControlFlag: boolean;
  enableOptimizationFlag: boolean;
  socSecurityReservePercent: number;
  socTargetSummerPercent: number;
  socTargetWinterPercent: number;
  rampRateThresholdMWPerMin: number;
  gridChargeWhenPvForecastWeak?: boolean;
}

export type EMSMode =
  | "pv_to_load"
  | "pv_to_load_and_battery"
  | "battery_peak_discharge"
  | "grid_off_peak_charge"
  | "wheeling"
  | "curtailment"
  | "standby";

