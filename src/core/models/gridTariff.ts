export type TariffPeriodName = "peak" | "full" | "offPeak";

export interface HourRange {
  startHour: number;
  endHour: number;
}

export interface GridTariff {
  tariffName: string;
  peakTariffDhPerKWh: number;
  fullTariffDhPerKWh: number;
  offPeakTariffDhPerKWh: number;
  peakHours: HourRange[];
  fullHours: HourRange[];
  offPeakHours: HourRange[];
  feedInTariffDhPerKWh?: number;
  wheelingValueDhPerKWh?: number;
  currency: string;
}

