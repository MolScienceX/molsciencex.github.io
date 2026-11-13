import type { Lang, Molecule } from "./data";

export const queryTypes = ["auto", "name", "smiles", "formula", "cas", "inchikey", "inchi", "cid", "molscience_id"] as const;
export type QueryType = typeof queryTypes[number];
export type SearchSort = "relevance" | "id" | "name" | "created_at_desc" | "created_at_asc";
export type SearchMatch = {
  field: "molscience_id" | "compound_name" | "iupac_name" | "molecular_formula" | "smiles_original" | "smiles_canonical" | "smiles_isomeric" | "inchi" | "inchi_key" | "cas_number" | "pubchem_cid";
  kind: "exact" | "prefix" | "contains";
};
export const queryTypeLabels: Record<QueryType, Record<Lang, string>> = {
  auto: {zh:"自动（按字段匹配）",en:"Auto (field-aware)"}, name:{zh:"分子名称",en:"Name"},
  smiles:{zh:"SMILES",en:"SMILES"}, formula:{zh:"分子式",en:"Formula"},
  cas:{zh:"CAS",en:"CAS"}, inchikey:{zh:"InChIKey",en:"InChIKey"},
  inchi:{zh:"InChI",en:"InChI"}, cid:{zh:"PubChem CID",en:"PubChem CID"},
  molscience_id:{zh:"MolScience ID",en:"MolScience ID"},
};
export function readQueryType(params: URLSearchParams): QueryType {
  const value = params.get("query_type");
  if (queryTypes.includes(value as QueryType)) return value as QueryType;
  return params.get("source") === "draw" ? "smiles" : "auto";
}
export function readSearchSort(params: URLSearchParams): SearchSort {
  const value = params.get("sort");
  return ["relevance", "id", "name", "created_at_desc", "created_at_asc"].includes(value || "")
    ? value as SearchSort : params.get("q")?.trim() ? "relevance" : "id";
}
export function matchLabel(match: SearchMatch | undefined, lang: Lang): string {
  if (!match) return lang === "zh" ? "数据库记录" : "Database record";
  const fields: Record<SearchMatch["field"], string> = {
    compound_name:lang==="zh"?"名称":"Name", iupac_name:"IUPAC", molecular_formula:lang==="zh"?"分子式":"Formula",
    molscience_id:"MolScience ID", cas_number:"CAS", inchi:"InChI", inchi_key:"InChIKey", pubchem_cid:"PubChem CID",
    smiles_original:"SMILES", smiles_canonical:"SMILES", smiles_isomeric:"SMILES",
  };
  const kind = {exact:lang==="zh"?"完全匹配":"exact match",prefix:lang==="zh"?"前缀匹配":"prefix match",contains:lang==="zh"?"包含匹配":"contains match"}[match.kind];
  return `${fields[match.field]} ${match.field.startsWith("smiles_") ? (lang==="zh"?"文本":"text ") : ""}${kind}`;
}

export function appendSearchPage(current: Molecule[], next: Molecule[]): Molecule[] {
  const seen = new Set(current.map(item => item.uuid || item.id));
  return [...current, ...next.filter(item => {
    const id = item.uuid || item.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  })];
}
