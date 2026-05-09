import type { EnergyProfilePoint as LegacyProfilePoint } from "../utils/time.ts";
import type { EnergyProfilePoint, ProfileValidationResult, ProfileValidationWarning } from "../models/profile.ts";
import { buildHourlyTimestamps } from "../utils/time.ts";

export interface CsvProfileOptions {
  expectedLength?: number;
  allowShortProfile?: boolean;
  constantLoadMW?: number;
  simulationStepMinutes?: number;
  startTimestamp?: string;
  profileName?: string;
}

export interface ParsedProfiles {
  combinedProfile: EnergyProfilePoint[];
  pvProfile: LegacyProfilePoint[];
  loadProfile: LegacyProfilePoint[];
  validation: ProfileValidationResult;
}

type RawProfileRow = Record<string, string>;

const TIMESTAMP_COLUMNS = ["timestamp", "datetime", "date_time", "date"];
const PV_COLUMNS = ["production_mwh", "pv_production_mwh", "pv_mwh"];
const LOAD_COLUMNS = ["consumption_mwh", "load_mwh", "demand_mwh"];

export function parseCsvProfile(csvText: string, options: CsvProfileOptions = {}): ParsedProfiles {
  const rawRows = parseCsvRows(csvText);
  const combinedProfile = normalizeProfileColumns(rawRows, options);
  const validation = validateHourlyProfile(combinedProfile, options);

  if (!validation.isValid) {
    throw new Error(`Invalid CSV profile: ${validation.errors.join(" ")}`);
  }

  return toParsedProfiles(combinedProfile, validation);
}

export function parseEnergyProfileCsv(csvText: string, expectedLength?: number): ParsedProfiles {
  return parseCsvProfile(csvText, { expectedLength });
}

export function normalizeProfileColumns(rawRows: RawProfileRow[], options: CsvProfileOptions = {}): EnergyProfilePoint[] {
  if (rawRows.length === 0) {
    return [];
  }

  const firstRow = rawRows[0];
  const headers = Object.keys(firstRow);
  const timestampColumn = findColumn(headers, TIMESTAMP_COLUMNS);
  const pvColumn = findColumn(headers, PV_COLUMNS);
  const loadColumn = findColumn(headers, LOAD_COLUMNS);

  if (!pvColumn) {
    throw new Error(`Missing CSV production column. Accepted names: ${PV_COLUMNS.join(", ")}.`);
  }

  if (!timestampColumn && !options.startTimestamp) {
    throw new Error("Missing timestamp column. Provide a timestamp column or startTimestamp option.");
  }

  if (!loadColumn && options.constantLoadMW === undefined) {
    throw new Error(`Missing CSV consumption column. Accepted names: ${LOAD_COLUMNS.join(", ")}, or provide constantLoadMW.`);
  }

  const generatedTimestamps = timestampColumn
    ? undefined
    : buildHourlyTimestamps(options.startTimestamp ?? "", rawRows.length);
  const stepHours = (options.simulationStepMinutes ?? 60) / 60;

  return rawRows.map((row, index) => ({
    timestamp: timestampColumn ? row[timestampColumn] : generatedTimestamps?.[index] ?? "",
    pvProductionMWh: Number(row[pvColumn]),
    loadMWh: loadColumn ? Number(row[loadColumn]) : (options.constantLoadMW ?? 0) * stepHours,
  }));
}

export function validateHourlyProfile(
  profile: EnergyProfilePoint[],
  options: CsvProfileOptions = {},
): ProfileValidationResult {
  const errors: string[] = [];
  const warnings: ProfileValidationWarning[] = [];
  const expectedLength = options.expectedLength;

  if (profile.length === 0) {
    errors.push("Profile must contain at least one row.");
  }

  if (expectedLength !== undefined && profile.length !== expectedLength) {
    if (options.allowShortProfile) {
      warnings.push({
        code: "unexpected_profile_length",
        message: `Profile contains ${profile.length} rows; expected ${expectedLength}.`,
      });
    } else {
      errors.push(`Profile must contain exactly ${expectedLength} rows.`);
    }
  }

  if (expectedLength === undefined && profile.length !== 8760 && profile.length !== 8784) {
    warnings.push({
      code: "not_full_year_profile",
      message: `Profile contains ${profile.length} rows; full annual hourly profiles usually contain 8760 or 8784 rows.`,
    });
  }

  const seenTimestamps = new Set<string>();
  let previousTimestampMs = -Infinity;

  profile.forEach((point, index) => {
    const rowLabel = `Row ${index + 1}`;
    const timestampMs = parseTimestampForOrdering(point.timestamp);

    if (!point.timestamp || !Number.isFinite(timestampMs)) {
      errors.push(`${rowLabel} has a missing or invalid timestamp.`);
    }

    if (seenTimestamps.has(point.timestamp)) {
      errors.push(`${rowLabel} duplicates timestamp ${point.timestamp}.`);
    }
    seenTimestamps.add(point.timestamp);

    if (Number.isFinite(timestampMs) && timestampMs <= previousTimestampMs) {
      errors.push(`${rowLabel} timestamp is not strictly ordered.`);
    }
    if (Number.isFinite(timestampMs)) {
      previousTimestampMs = timestampMs;
    }

    if (!Number.isFinite(point.pvProductionMWh)) {
      errors.push(`${rowLabel} has non-numeric PV production.`);
    } else if (point.pvProductionMWh < 0) {
      errors.push(`${rowLabel} has negative PV production.`);
    }

    if (!Number.isFinite(point.loadMWh)) {
      errors.push(`${rowLabel} has non-numeric load.`);
    } else if (point.loadMWh < 0) {
      errors.push(`${rowLabel} has negative load.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function generateConstantLoadProfile(timestamps: string[], constantLoadMW: number, simulationStepMinutes = 60): LegacyProfilePoint[] {
  const stepHours = simulationStepMinutes / 60;
  return timestamps.map((timestamp) => ({
    timestamp,
    valueMWh: constantLoadMW * stepHours,
  }));
}

export function mergePVAndLoadProfiles(
  pvProfile: LegacyProfilePoint[],
  loadProfile: LegacyProfilePoint[],
): EnergyProfilePoint[] {
  if (pvProfile.length !== loadProfile.length) {
    throw new Error("PV and load profiles must have the same length.");
  }

  return pvProfile.map((pvPoint, index) => {
    const loadPoint = loadProfile[index];
    if (pvPoint.timestamp !== loadPoint.timestamp) {
      throw new Error(`Timestamp mismatch at index ${index}: ${pvPoint.timestamp} vs ${loadPoint.timestamp}.`);
    }

    return {
      timestamp: pvPoint.timestamp,
      pvProductionMWh: pvPoint.valueMWh,
      loadMWh: loadPoint.valueMWh,
    };
  });
}

function toParsedProfiles(combinedProfile: EnergyProfilePoint[], validation: ProfileValidationResult): ParsedProfiles {
  return {
    combinedProfile,
    validation,
    pvProfile: combinedProfile.map((point) => ({ timestamp: point.timestamp, valueMWh: point.pvProductionMWh })),
    loadProfile: combinedProfile.map((point) => ({ timestamp: point.timestamp, valueMWh: point.loadMWh })),
  };
}

function parseCsvRows(csvText: string): RawProfileRow[] {
  const lines = csvText.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV profile must include a header and at least one data row.");
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((header) => normalizeHeader(header));

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ""));
    return headers.reduce<RawProfileRow>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function normalizeHeader(header: string): string {
  return header.trim().replace(/^"|"$/g, "").toLowerCase();
}

function findColumn(headers: string[], candidates: string[]): string | undefined {
  return candidates.find((candidate) => headers.includes(candidate));
}

function parseTimestampForOrdering(timestamp: string): number {
  const cleanIsoMatch = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (cleanIsoMatch) {
    return Date.UTC(
      Number(cleanIsoMatch[1]),
      Number(cleanIsoMatch[2]) - 1,
      Number(cleanIsoMatch[3]),
      Number(cleanIsoMatch[4]),
      Number(cleanIsoMatch[5]),
      Number(cleanIsoMatch[6]),
    );
  }

  return new Date(timestamp).getTime();
}
