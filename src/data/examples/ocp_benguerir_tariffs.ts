import type { GridTariff } from "../../core/models/gridTariff.ts";

export const ocpBenguerirTariff: GridTariff = {
  tariffName: "OCP Benguerir editable TOU tariff",
  peakTariffDhPerKWh: 1.3645,
  fullTariffDhPerKWh: 0.9736,
  offPeakTariffDhPerKWh: 0.7131,
  peakHours: [{ startHour: 17, endHour: 23 }],
  fullHours: [{ startHour: 7, endHour: 17 }],
  offPeakHours: [{ startHour: 22, endHour: 7 }],
  wheelingValueDhPerKWh: 0.7131,
  currency: "DH",
};

