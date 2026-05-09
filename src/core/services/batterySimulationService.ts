import type { BatterySystem } from "../models/battery.ts";
import type { EMSMode, EMSStrategy } from "../models/ems.ts";
import type { GridTariff } from "../models/gridTariff.ts";
import type { DispatchStepResult } from "../models/scenario.ts";
import type { CombinedProfilePoint } from "../utils/time.ts";
import { getTariffPeriod } from "../utils/time.ts";
import { clamp, percentToRatio, ratioToPercent } from "../utils/units.ts";

export interface BatterySimulationInput {
  profile: CombinedProfilePoint[];
  battery: BatterySystem;
  tariff: GridTariff;
  strategy: EMSStrategy;
  simulationStepMinutes: number;
}

export function simulateBatteryDispatch(input: BatterySimulationInput): DispatchStepResult[] {
  const { profile, battery, tariff, strategy, simulationStepMinutes } = input;
  const stepHours = simulationStepMinutes / 60;
  const maxEnergyPerStepMWh = battery.powerMW * stepHours;
  const chargeEfficiency = Math.sqrt(battery.roundTripEfficiency);
  const dischargeEfficiency = Math.sqrt(battery.roundTripEfficiency);
  const minSocMWh = battery.capacityMWh * percentToRatio(battery.minSocPercent);
  const maxSocMWh = battery.capacityMWh * percentToRatio(battery.maxSocPercent);
  const securityReserveMWh = battery.capacityMWh * percentToRatio(strategy.socSecurityReservePercent);
  let socMWh = clamp(battery.capacityMWh * percentToRatio(battery.initialSocPercent), minSocMWh, maxSocMWh);

  return profile.map((point) => {
    const warningFlags: string[] = [];
    const tariffPeriod = getTariffPeriod(point.timestamp, tariff);
    const availableChargeRoomMWh = () => Math.max(0, maxSocMWh - socMWh);
    const dischargeFloorMWh = Math.max(minSocMWh, securityReserveMWh);
    const availableDischargeMWh = () => Math.max(0, socMWh - dischargeFloorMWh);
    let emsMode: EMSMode = "standby";
    let remainingPvMWh = point.pvProductionMWh;
    let remainingLoadMWh = point.loadMWh;
    let pvToLoadMWh = 0;
    let pvToBatteryMWh = 0;
    let batteryToLoadMWh = 0;
    let gridToLoadMWh = 0;
    let gridToBatteryMWh = 0;
    let wheelingMWh = 0;
    let curtailedMWh = 0;

    // EMS priority 1: consume PV on site before charging, wheeling, or curtailing.
    if (strategy.allowPvToLoad) {
      pvToLoadMWh = Math.min(remainingPvMWh, remainingLoadMWh);
      remainingPvMWh -= pvToLoadMWh;
      remainingLoadMWh -= pvToLoadMWh;
      if (pvToLoadMWh > 0) emsMode = "pv_to_load";
    }

    // EMS priority 2: store PV surplus when the strategy allows PV-to-BESS charging.
    if (strategy.allowPvToBattery && remainingPvMWh > 0 && availableChargeRoomMWh() > 0) {
      const chargeFromPvMWh = Math.min(remainingPvMWh, maxEnergyPerStepMWh, availableChargeRoomMWh() / chargeEfficiency);
      pvToBatteryMWh = chargeFromPvMWh;
      socMWh += chargeFromPvMWh * chargeEfficiency;
      remainingPvMWh -= chargeFromPvMWh;
      if (chargeFromPvMWh > 0) emsMode = "pv_to_load_and_battery";
    }

    // EMS priority 3: discharge during peak hours to reduce expensive grid purchases.
    if (tariffPeriod === "peak" && strategy.allowBatteryToLoad && remainingLoadMWh > 0 && availableDischargeMWh() > 0) {
      const deliverableMWh = Math.min(remainingLoadMWh, maxEnergyPerStepMWh, availableDischargeMWh() * dischargeEfficiency);
      batteryToLoadMWh = deliverableMWh;
      socMWh -= deliverableMWh / dischargeEfficiency;
      remainingLoadMWh -= deliverableMWh;
      if (deliverableMWh > 0) emsMode = "battery_peak_discharge";
    }

    gridToLoadMWh = Math.max(0, remainingLoadMWh);

    const gridChargingAllowed =
      (tariffPeriod === "offPeak" && strategy.allowGridToBatteryOffPeak) ||
      (tariffPeriod === "full" && strategy.allowGridToBatteryFullHours) ||
      (tariffPeriod === "peak" && strategy.allowGridToBatteryPeakHours);
    const forecastGateOpen = !strategy.enableWeatherForecastFlag || strategy.gridChargeWhenPvForecastWeak === true;

    // EMS priority 4: optional grid charging is limited by tariff-period permissions.
    if (gridChargingAllowed && forecastGateOpen && availableChargeRoomMWh() > 0) {
      const targetSocMWh = battery.capacityMWh * percentToRatio(strategy.socTargetWinterPercent);
      const targetRoomMWh = Math.max(0, Math.min(targetSocMWh, maxSocMWh) - socMWh);
      const chargeFromGridMWh = Math.min(maxEnergyPerStepMWh - pvToBatteryMWh, targetRoomMWh / chargeEfficiency, availableChargeRoomMWh() / chargeEfficiency);
      gridToBatteryMWh = Math.max(0, chargeFromGridMWh);
      socMWh += gridToBatteryMWh * chargeEfficiency;
      if (gridToBatteryMWh > 0) emsMode = "grid_off_peak_charge";
    }

    if (remainingPvMWh > 0 && strategy.allowWheeling) {
      wheelingMWh = remainingPvMWh;
      remainingPvMWh = 0;
      emsMode = "wheeling";
    }

    if (remainingPvMWh > 0) {
      curtailedMWh = strategy.allowCurtailment ? remainingPvMWh : 0;
      remainingPvMWh = 0;
      if (curtailedMWh > 0) emsMode = "curtailment";
    }

    socMWh = clamp(socMWh, minSocMWh, maxSocMWh);
    if (socMWh <= minSocMWh + 1e-9) warningFlags.push("soc_at_minimum");
    if (socMWh >= maxSocMWh - 1e-9) warningFlags.push("soc_at_maximum");

    return {
      timestamp: point.timestamp,
      pvProductionMWh: point.pvProductionMWh,
      loadMWh: point.loadMWh,
      pvToLoadMWh,
      pvToBatteryMWh,
      batteryToLoadMWh,
      gridToLoadMWh,
      gridToBatteryMWh,
      wheelingMWh,
      curtailedMWh,
      socMWh,
      socPercent: ratioToPercent(socMWh / battery.capacityMWh),
      emsMode,
      tariffPeriod,
      warningFlags,
    };
  });
}

