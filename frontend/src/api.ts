import { Molecule, Property, RecordStatus, StandardizationStatus } from "./data";
import { API_BASE_URL } from "./api/config";

type MoleculeResponse = {
  id: string;
  molscience_id: string;
  compound_name: string | null;
  iupac_name: string | null;
  molecular_formula: string | null;
  smiles_original: string;
  smiles_canonical: string | null;
  smiles_isomeric: string | null;
  inchi: string | null;
  inchi_key: string | null;
  cas_number: string | null;
  pubchem_cid: number | null;
  standardization_status: "PENDING" | "STANDARDIZED" | "FAILED";
  standardization_version: string | null;
  record_status: "ACTIVE" | "DEPRECATED" | "DELETED";
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type MoleculePropertyResponse = {
  id: string;
  property_code: string;
  property_name_zh: string;
  property_name_en: string | null;
  category_code: string;
  canonical_unit_code: string;
  qualifier: "EXACT" | "APPROX" | "RANGE" | "LESS_THAN" | "GREATER_THAN";
  value_numeric: string | number | null;
  value_min: string | number | null;
  value_max: string | number | null;
  raw_value: string;
  conditions: Record<string, unknown> | null;
  source_code: string;
  source_name: string;
  source_type: "USER" | "DATASET" | "PLATFORM";
  source_record_key: string | null;
  review_status: "PENDING" | "ACCEPTED" | "REJECTED";
  created_at: string;
};

export type MoleculeListOptions = {
  offset?: number;
  limit?: number;
  query?: string;
  recordStatus?: Exclude<RecordStatus, "DELETED">;
  standardizationStatus?: StandardizationStatus;
  sort?: "id" | "created_at_desc" | "created_at_asc" | "name";
};

function toMolecule(row: MoleculeResponse): Molecule {
  const displayName = row.compound_name || row.iupac_name || row.molscience_id;
  return {
    uuid: row.id,
    id: row.molscience_id,
    cid: row.pubchem_cid || 0,
    inchikey: row.inchi_key || "",
    name: { zh: displayName, en: displayName },
    iupac: row.iupac_name || "",
    aliases: [],
    formula: row.molecular_formula || "",
    mass: "",
    cas: row.cas_number || "",
    smiles: row.smiles_canonical || row.smiles_original,
    inchi: row.inchi || "",
    description: { zh: "", en: "" },
    categories: [],
    sources: [],
    properties: [],
    spectra: [],
    standardizationStatus: row.standardization_status,
    standardizationVersion: row.standardization_version || undefined,
    recordStatus: row.record_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    safety: {
      level: "info",
      label: { zh: "暂无安全数据", en: "No safety data" },
      zh: [],
      en: [],
    },
  };
}

const unitLabels: Record<string, string> = {
  "1": "",
  angstrom_squared: "Å²",
};

function displayUnit(unitCode: string): string {
  return unitLabels[unitCode] ?? unitCode;
}

function withUnit(rawValue: string, unitCode: string): string {
  const unit = displayUnit(unitCode);
  return unit ? `${rawValue} ${unit}` : rawValue;
}

function toProperties(rows: MoleculePropertyResponse[]): Property[] {
  const properties = new Map<string, Property>();

  for (const row of rows) {
    const conditions = row.conditions ?? {};
    const sourceMetadata =
      typeof conditions.source_metadata === "object" && conditions.source_metadata !== null
        ? conditions.source_metadata as Record<string, unknown>
        : {};
    const software = typeof sourceMetadata.software === "string" ? sourceMetadata.software : "";
    const version = typeof sourceMetadata.version === "string" ? sourceMetadata.version : "";
    const origin = typeof conditions.value_origin === "string" ? conditions.value_origin : "UNKNOWN";
    const method = [software, version].filter(Boolean).join(" ");
    const value = withUnit(row.raw_value, row.canonical_unit_code);
    const record = {
      id: row.id,
      value,
      rawValue: row.raw_value,
      condition: "",
      source: row.source_name,
      sourceCode: row.source_code,
      sourceRecordKey: row.source_record_key ?? undefined,
      method: method || undefined,
      origin,
      qualifier: row.qualifier,
      reviewStatus: row.review_status,
    };
    const existing = properties.get(row.property_code);
    if (existing) {
      existing.records.push(record);
      continue;
    }
    properties.set(row.property_code, {
      key: row.property_code,
      label: {
        zh: row.property_name_zh,
        en: row.property_name_en || row.property_name_zh,
      },
      value,
      condition: "",
      records: [record],
      unit: displayUnit(row.canonical_unit_code),
      origin,
      reviewStatus: row.review_status,
    });
  }

  return [...properties.values()];
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "not-found" : `api-${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getMolecules(
  signal?: AbortSignal,
  options: MoleculeListOptions = {},
): Promise<Molecule[]> {
  const params = new URLSearchParams({
    offset: String(options.offset ?? 0),
    limit: String(options.limit ?? 100),
    sort: options.sort ?? "id",
  });
  if (options.query?.trim()) params.set("q", options.query.trim());
  if (options.recordStatus) params.set("record_status", options.recordStatus);
  if (options.standardizationStatus) {
    params.set("standardization_status", options.standardizationStatus);
  }
  const rows = await request<MoleculeResponse[]>(`/molecules?${params}`, signal);
  return rows.map(toMolecule);
}

export async function getMolecule(id: string, signal?: AbortSignal): Promise<Molecule> {
  const encodedId = encodeURIComponent(id);
  const [row, observations] = await Promise.all([
    request<MoleculeResponse>(`/molecules/${encodedId}`, signal),
    request<MoleculePropertyResponse[]>(`/molecules/${encodedId}/properties`, signal),
  ]);
  const molecule = toMolecule(row);
  molecule.properties = toProperties(observations);
  molecule.sources = [...new Set(observations.map(record => record.source_name))];
  if (molecule.properties.length) molecule.categories.push("numeric");
  const molecularWeight = molecule.properties.find(property => property.key === "molecular_weight");
  molecule.mass = molecularWeight?.records[0]?.rawValue || "";
  return molecule;
}
