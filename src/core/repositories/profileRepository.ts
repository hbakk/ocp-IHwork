import type { EnergyProfilePoint } from "../utils/time.ts";
import { ocpBenguerirLoadProfileSample, ocpBenguerirPvProfileSample } from "../../data/examples/ocp_benguerir_profiles_sample.ts";
import { parseEnergyProfileCsv, type ParsedProfiles } from "../services/dataLoader.ts";

export interface ProjectProfiles {
  pvProfile: EnergyProfilePoint[];
  loadProfile: EnergyProfilePoint[];
}

export function getOcpBenguerirSampleProfiles(): ProjectProfiles {
  return {
    pvProfile: ocpBenguerirPvProfileSample,
    loadProfile: ocpBenguerirLoadProfileSample,
  };
}

export function loadProfilesFromCsvText(csvText: string, expectedLength?: number): ParsedProfiles {
  return parseEnergyProfileCsv(csvText, expectedLength);
}

