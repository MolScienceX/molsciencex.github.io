export type Lang = "zh" | "en";
export type StandardizationStatus = "PENDING" | "STANDARDIZED" | "FAILED";
export type RecordStatus = "ACTIVE" | "DEPRECATED" | "DELETED";
export type RecordValue = { value: string; condition: string; source: string; quality: "recommended" | "high" | "standard"; method?: string };
export type Property = { key: string; label: { zh: string; en: string }; value: string; condition: string; records: RecordValue[] };
export type Molecule = {
  uuid?: string; id: string; cid: number; inchikey: string; name: { zh: string; en: string }; iupac: string; aliases: string[];
  formula: string; mass: string; cas: string; smiles: string; inchi: string; description: { zh: string; en: string };
  categories: ("numeric" | "spectra" | "safety")[]; sources: string[]; properties: Property[]; spectra: string[];
  safety: { level: "danger" | "warning" | "info"; label: { zh: string; en: string }; zh: string[]; en: string[] };
  standardizationStatus?: StandardizationStatus; standardizationVersion?: string;
  recordStatus?: RecordStatus; createdAt?: string; updatedAt?: string;
};

export const molecules: Molecule[] = [
  {
    id: "MS-0000702", cid: 702, inchikey: "LFQSCWFLJHTTHZ-UHFFFAOYSA-N",
    name: { zh: "乙醇", en: "Ethanol" }, iupac: "Ethanol", aliases: ["酒精", "Ethyl alcohol", "Alcohol"],
    formula: "C2H6O", mass: "46.07", cas: "64-17-5", smiles: "CCO", inchi: "InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3",
    description: { zh: "一种无色、易挥发、易燃的液体，广泛用作溶剂、燃料和化学原料。", en: "A colorless, volatile and flammable liquid widely used as a solvent, fuel and chemical feedstock." },
    categories: ["numeric", "spectra", "safety"], sources: ["PubChem", "NIST Chemistry WebBook", "ECHA"],
    properties: [
      { key: "boiling", label: { zh: "沸点", en: "Boiling point" }, value: "78.37 °C", condition: "101.325 kPa", records: [
        { value: "78.37 °C", condition: "101.325 kPa", source: "NIST", quality: "recommended", method: "实验测定" },
        { value: "78.29 °C", condition: "101.3 kPa", source: "PubChem", quality: "high" },
        { value: "78.50 °C", condition: "条件未注明", source: "ECHA", quality: "standard" }
      ]},
      { key: "melting", label: { zh: "熔点", en: "Melting point" }, value: "−114.1 °C", condition: "101.325 kPa", records: [
        { value: "−114.1 °C", condition: "101.325 kPa", source: "NIST", quality: "recommended" },
        { value: "−114.5 °C", condition: "条件未注明", source: "PubChem", quality: "high" }
      ]},
      { key: "density", label: { zh: "密度", en: "Density" }, value: "0.7893 g/mL", condition: "20 °C", records: [
        { value: "0.7893 g/mL", condition: "20 °C", source: "NIST", quality: "recommended" },
        { value: "0.789 g/mL", condition: "20 °C", source: "PubChem", quality: "high" },
        { value: "0.785 g/mL", condition: "25 °C", source: "ECHA", quality: "standard" }
      ]},
      { key: "flash", label: { zh: "闪点", en: "Flash point" }, value: "13 °C", condition: "闭杯", records: [
        { value: "13 °C", condition: "闭杯", source: "ECHA", quality: "recommended" },
        { value: "16.6 °C", condition: "开杯", source: "PubChem", quality: "high" }
      ]}
    ],
    spectra: ["¹H NMR", "¹³C NMR", "IR", "Mass spectrum", "UV/Vis", "Raman"],
    safety: { level: "danger", label: { zh: "危险", en: "Danger" }, zh: ["高度易燃液体和蒸气", "造成严重眼刺激"], en: ["Highly flammable liquid and vapor", "Causes serious eye irritation"] }
  },
  {
    id: "MS-0000962", cid: 962, inchikey: "XLYOFNOQVPJJNP-UHFFFAOYSA-N",
    name: { zh: "水", en: "Water" }, iupac: "Oxidane", aliases: ["一氧化二氢", "Dihydrogen monoxide", "Aqua"],
    formula: "H2O", mass: "18.015", cas: "7732-18-5", smiles: "O", inchi: "InChI=1S/H2O/h1H2",
    description: { zh: "由氢和氧组成的无机化合物，是生命体系和化学过程中的重要介质。", en: "An inorganic compound of hydrogen and oxygen, central to living systems and chemical processes." },
    categories: ["numeric", "spectra"], sources: ["PubChem", "NIST Chemistry WebBook"],
    properties: [
      { key: "boiling", label: { zh: "沸点", en: "Boiling point" }, value: "100.00 °C", condition: "101.325 kPa", records: [{ value: "100.00 °C", condition: "101.325 kPa", source: "NIST", quality: "recommended" }]},
      { key: "melting", label: { zh: "熔点", en: "Melting point" }, value: "0.00 °C", condition: "101.325 kPa", records: [{ value: "0.00 °C", condition: "101.325 kPa", source: "NIST", quality: "recommended" }]},
      { key: "density", label: { zh: "密度", en: "Density" }, value: "0.9982 g/mL", condition: "20 °C", records: [{ value: "0.9982 g/mL", condition: "20 °C", source: "NIST", quality: "recommended" }]}
    ], spectra: ["IR", "Raman"],
    safety: { level: "info", label: { zh: "未分类为危险品", en: "Not classified as hazardous" }, zh: ["按通常条件使用时无已知显著危害"], en: ["No significant known hazard under normal use"] }
  },
  {
    id: "MS-0002519", cid: 2519, inchikey: "RYYVLZVUVIJVGH-UHFFFAOYSA-N",
    name: { zh: "咖啡因", en: "Caffeine" }, iupac: "1,3,7-Trimethylpurine-2,6-dione", aliases: ["茶素", "Coffeine", "Guaranine"],
    formula: "C8H10N4O2", mass: "194.19", cas: "58-08-2", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", inchi: "InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3",
    description: { zh: "一种天然存在的甲基黄嘌呤类生物碱，也是常见的中枢神经兴奋剂。", en: "A naturally occurring methylxanthine alkaloid and common central nervous system stimulant." },
    categories: ["numeric", "spectra", "safety"], sources: ["PubChem", "ChEBI", "DrugBank"],
    properties: [
      { key: "melting", label: { zh: "熔点", en: "Melting point" }, value: "235–238 °C", condition: "升华", records: [{ value: "235–238 °C", condition: "升华", source: "PubChem", quality: "recommended" }]},
      { key: "solubility", label: { zh: "水中溶解度", en: "Water solubility" }, value: "21.7 mg/mL", condition: "25 °C", records: [{ value: "21.7 mg/mL", condition: "25 °C", source: "PubChem", quality: "recommended" }]}
    ], spectra: ["¹H NMR", "¹³C NMR", "IR", "Mass spectrum"],
    safety: { level: "warning", label: { zh: "警告", en: "Warning" }, zh: ["吞咽可能有害", "高剂量摄入可能引起不良反应"], en: ["May be harmful if swallowed", "High doses may cause adverse effects"] }
  }
];

export const structureImage = (m: Molecule, size = "small") => m.cid > 0 ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${m.cid}/PNG?record_type=2d&image_size=${size}` : null;
export const detectType = (q: string, lang: Lang) => {
  const v = q.trim(); const t = lang === "zh" ? ["CAS 号", "InChIKey", "InChI", "分子式", "SMILES", "分子名称或别名"] : ["CAS Registry Number", "InChIKey", "InChI", "molecular formula", "SMILES", "molecule name or alias"];
  if (/^\d{2,7}-\d{2}-\d$/.test(v)) return t[0]; if (/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(v)) return t[1]; if (/^InChI=/i.test(v)) return t[2];
  if (/^(?=.*[A-Z])(?:[A-Z][a-z]?\d*)+$/.test(v)) return t[3]; if (/[=#()[\]@+\\/]/.test(v) || /^(?:C|N|O|S|P|F|Cl|Br|I){1,6}$/.test(v)) return t[4]; return t[5];
};
export const findMolecules = (q: string, source: Molecule[] = molecules) => { const n = q.trim().toLowerCase().replace(/\s/g, ""); if (!n) return source; return source.filter(m => [m.name.zh,m.name.en,m.iupac,...m.aliases,m.formula,m.cas,m.smiles,m.inchi,m.inchikey,m.id].some(v => v.toLowerCase().replace(/\s/g, "").includes(n))); };
