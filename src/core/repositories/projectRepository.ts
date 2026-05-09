import type { IndustrialEnergyProjectConfig } from "../models/scenario.ts";
import { ocpBenguerirProjectConfig } from "../../data/examples/ocp_benguerir_project.ts";

const exampleProjects: IndustrialEnergyProjectConfig[] = [ocpBenguerirProjectConfig];

export function listExampleProjects(): IndustrialEnergyProjectConfig[] {
  return exampleProjects;
}

export function getExampleProjectById(projectId: string): IndustrialEnergyProjectConfig | undefined {
  return exampleProjects.find((projectConfig) => projectConfig.project.projectId === projectId);
}

