import type { GridTariff, HourRange, TariffPeriodName } from "../models/gridTariff.ts";

export interface EnergyProfilePoint {
  timestamp: string;
  valueMWh: number;
}

export interface CombinedProfilePoint {
  timestamp: string;
  pvProductionMWh: number;
  loadMWh: number;
}

export function getHourOfDay(timestamp: string): number {
  const cleanIsoMatch = timestamp.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):\d{2}:\d{2}$/);
  if (cleanIsoMatch) {
    return Number(cleanIsoMatch[1]);
  }

  return new Date(timestamp).getHours();
}

export function isHourInRange(hour: number, range: HourRange): boolean {
  if (range.startHour === range.endHour) {
    return true;
  }

  if (range.startHour < range.endHour) {
    return hour >= range.startHour && hour < range.endHour;
  }

  return hour >= range.startHour || hour < range.endHour;
}

export function getTariffPeriod(timestamp: string, tariff: GridTariff): TariffPeriodName {
  const hour = getHourOfDay(timestamp);

  if (tariff.peakHours.some((range) => isHourInRange(hour, range))) {
    return "peak";
  }

  if (tariff.fullHours.some((range) => isHourInRange(hour, range))) {
    return "full";
  }

  return "offPeak";
}

export function getTariffDhPerKWh(timestamp: string, tariff: GridTariff): number {
  const period = getTariffPeriod(timestamp, tariff);
  if (period === "peak") return tariff.peakTariffDhPerKWh;
  if (period === "full") return tariff.fullTariffDhPerKWh;
  return tariff.offPeakTariffDhPerKWh;
}

export function getMonthKey(timestamp: string): string {
  return timestamp.slice(0, 7);
}

export function buildHourlyTimestamps(startIso: string, hours: number): string[] {
  const start = new Date(startIso);
  return Array.from({ length: hours }, (_, index) => {
    const timestamp = new Date(start.getTime() + index * 60 * 60 * 1000);
    return timestamp.toISOString();
  });
}
