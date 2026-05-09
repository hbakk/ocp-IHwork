# Optimisation OCP PV

Optimisation OCP PV is a PV-BESS and EMS simulation platform for OCP-style industrial energy projects, supporting solar profitability, storage cost analysis, full PV-BESS simulation, and OCP Benguerir EMS studies.

## Backend EMS Simulation Engine

The backend/data layer lives under `src/core` and is designed so OCP Benguerir is one example project rather than hardcoded global logic.

### Run Tests

```bash
npm run test:backend
npm run test:annual
npm run build
```

`test:backend` runs the small OCP Benguerir sample profile smoke test.

`test:annual` generates a synthetic 8760-hour OCP-style profile and validates a full annual EMS simulation, monthly aggregation, SoC bounds, and forbidden grid charging rules.

### Expected CSV Format

Preferred annual CSV columns:

```csv
timestamp,production_mwh,consumption_mwh
2025-01-01T00:00:00.000Z,0,25
2025-01-01T01:00:00.000Z,0,25
```

Accepted PV production column names:

- `production_mwh`
- `pv_production_mwh`
- `pv_mwh`

Accepted load column names:

- `consumption_mwh`
- `load_mwh`
- `demand_mwh`

If the load column is missing, the loader can generate a constant hourly industrial load from `constantLoadMW`. For OCP Benguerir, use `constantLoadMW: 25`.

### OCP Benguerir Case

The OCP Benguerir example is represented in `src/data/examples/ocp_benguerir_project.ts`:

- Client: OCP Green Energy
- Site: Benguerir / Gantour
- PV: 67 MWc
- BESS: 25 MW / 125 MWh
- Load: 25 MW continuous
- Tariff: peak, full, and off-peak DH/kWh values
- EMS: PV-to-load priority, PV surplus to BESS, peak discharge, off-peak grid charging only when allowed, and wheeling enabled

The annual CSV template is available at `src/data/examples/ocp_benguerir_annual_profile_template.csv`.

The adapter in `src/data/examples/ocp_benguerir_profile_adapter.ts` shows how to map the future real OCP Excel/CSV export into:

```csv
timestamp,production_mwh,consumption_mwh
```

UI integration comes later. The current HTML pages are preserved and are not yet connected to this backend engine.

## Project Study Workflow

The project-study layer is intended for professional OCP and future industrial client studies before UI integration.

1. Prepare a reusable project config, such as `ocp_benguerir_project.ts`.
2. Load or parse an annual hourly profile with PV production and load.
3. Run a single annual simulation when studying one EMS configuration.
4. Run multiple scenarios with `runProjectStudy`.
5. Compare scenario KPIs such as grid purchase, BESS discharge, wheeling, curtailment, net gain, average cost, and SoC violations.
6. Export scenario comparison, monthly results, hourly dispatch, or study summary as CSV/JSON using `exportService.ts`.
7. Connect these results to the existing UI later.

The currently supported professional scenarios are:

- `BASE_GRID_ONLY`
- `PV_ONLY`
- `PV_BESS_BASIC`
- `PV_BESS_GRID_OFFPEAK`
- `PV_BESS_WHEELING`
- `PV_BESS_OPTIMIZED_PLACEHOLDER`

The optimized scenario is still a deterministic heuristic placeholder. Real LP/MPC optimization is a later step.

## Running OCP Study From Real CSV

1. Export the real OCP Excel profile to CSV.
2. Place it at:

```text
data/input/ocp_profile.csv
```

3. Preferred columns:

```csv
timestamp,production_mwh,consumption_mwh
2025-01-01T00:00:00,0,25
2025-01-01T01:00:00,0,25
```

Accepted timestamp columns:

- `timestamp`
- `date`
- `datetime`
- `time`
- `heure`
- `date_time`

Accepted PV production columns:

- `production_mwh`
- `pv_production_mwh`
- `pv_mwh`
- `production`
- `energie_pv`
- `energy_pv`
- `pv`
- `pvsyst_mwh`

Accepted load columns:

- `consumption_mwh`
- `load_mwh`
- `demand_mwh`
- `consommation`
- `consommation_mwh`
- `charge_mwh`
- `load`

If load is missing, the OCP runner generates a constant 25 MW load, equal to 25 MWh per hourly row.

Run the study:

```bash
npm run study:ocp-csv -- data/input/ocp_profile.csv
```

Outputs are written to:

```text
data/processed/ocp_scenario_comparison.csv
data/processed/ocp_study_summary.json
```

Real annual results require 8760 hourly rows for a normal year or 8784 rows for a leap year.
