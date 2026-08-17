import { Molecule, RecordStatus, StandardizationStatus } from "./data";
import { API_BASE_URL } from "./api/config";

type MoleculeResponse = {
  id: string;
  molscience_id: string;
  compound_name: string | null;
  iupac_name: string | null;
  molecular_formula: string | null;
  molecular_weight: string | number | null;
  smiles_original: string;
  smiles_canonical: string | null;
  smiles_isomeric: string | null;
  inchi: string | null;
  inchi_key: string | null;
  cas_number: string | null;
  pubchem_cid: number | null;
  description: string | null;
  standardization_status: "PENDING" | "STANDARDIZED" | "FAILED";
  standardization_version: string | null;
  record_status: "ACTIVE" | "DEPRECATED" | "DELETED";
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  const description = row.description || "";
  return {
    uuid: row.id,
    id: row.molscience_id,
    cid: row.pubchem_cid || 0,
    inchikey: row.inchi_key || "",
    name: { zh: displayName, en: displayName },
    iupac: row.iupac_name || "",
    aliases: [],
    formula: row.molecular_formula || "",
    mass: row.molecular_weight == null ? "" : String(row.molecular_weight),
    cas: row.cas_number || "",
    smiles: row.smiles_canonical || row.smiles_original,
    inchi: row.inchi || "",
    description: { zh: description, en: description },
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
  return toMolecule(await request<MoleculeResponse>(`/molecules/${encodeURIComponent(id)}`, signal));
}
