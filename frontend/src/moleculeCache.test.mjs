import test from "node:test";
import assert from "node:assert/strict";
import {
  MOLECULE_CACHE_DEFAULTS,
  MOLECULE_CACHE_PREFIX,
  MOLECULE_CACHE_VERSION,
  createMoleculeCache,
  isMolecule,
  isMoleculeSearchData,
  moleculeCacheKey,
  stableMoleculeQuery,
} from "./moleculeCache.ts";

const NOW = 1_800_000_000_000;
const DETAIL_ID = "4f7b6bd5-5339-4b8d-9453-a3b3f17a44a4";

class FakeStorage {
  constructor() {
    this.values = new Map();
    this.failReads = false;
    this.failWrites = false;
    this.failRemovals = false;
  }

  get length() {
    if (this.failReads) throw new Error("storage unavailable");
    return this.values.size;
  }

  key(index) {
    if (this.failReads) throw new Error("storage unavailable");
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key) {
    if (this.failReads) throw new Error("storage unavailable");
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    if (this.failWrites) throw new Error("quota exceeded");
    this.values.set(key, String(value));
  }

  removeItem(key) {
    if (this.failRemovals) throw new Error("removal denied");
    this.values.delete(key);
  }
}

function molecule(name = "Ethanol") {
  return {
    uuid: DETAIL_ID,
    id: "MS-0000702",
    cid: 702,
    inchikey: "LFQSCWFLJHTTHZ-UHFFFAOYSA-N",
    name: { zh: name, en: name },
    iupac: "ethanol",
    aliases: ["Alcohol"],
    formula: "C2H6O",
    mass: "46.07",
    cas: "64-17-5",
    smiles: "CCO",
    inchi: "InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3",
    description: { zh: "", en: "" },
    categories: ["numeric"],
    sources: ["PubChem"],
    properties: [{
      key: "molecular_weight",
      label: { zh: "分子量", en: "Molecular weight" },
      value: "46.07 g/mol",
      condition: "",
      records: [{
        id: "property-1",
        value: "46.07 g/mol",
        rawValue: "46.07",
        condition: "",
        source: "PubChem",
        sourceCode: "PUBCHEM",
        method: "PubChem 2.2",
        origin: "COMPUTED",
        qualifier: "EXACT",
        reviewStatus: "PENDING",
      }],
      unit: "g/mol",
      origin: "COMPUTED",
      reviewStatus: "PENDING",
    }],
    spectra: [],
    standardizationStatus: "STANDARDIZED",
    standardizationVersion: "v1",
    recordStatus: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    safety: {
      level: "info",
      label: { zh: "暂无安全数据", en: "No safety data" },
      zh: [],
      en: [],
    },
  };
}

function searchData(items = [molecule()]) {
  return {
    items,
    pagination: { offset: 0, limit: 100, has_more: false, next_offset: null },
  };
}

function cacheFor(storage, now = () => NOW, options = {}) {
  return createMoleculeCache({ storage, now, ...options });
}

function entryBytes(key, kind, value, fetchedAt) {
  const raw = JSON.stringify({
    version: MOLECULE_CACHE_VERSION,
    kind,
    fetchedAt,
    lastUsedAt: fetchedAt,
    value,
  });
  return key.length * 2 + raw.length * 2;
}

test("fresh successful and empty searches persist across cache instances", () => {
  const storage = new FakeStorage();
  let now = NOW;
  const key = moleculeCacheKey("https://api.example.test/api/v1", "search", "q=ethanol");
  assert.equal(cacheFor(storage, () => now).write(key, "search", searchData([]), isMoleculeSearchData), true);

  now += 60_000;
  const reopened = cacheFor(storage, () => now, { maxSearchEntries: 50 });
  const hit = reopened.read(key, "search", isMoleculeSearchData);
  assert.deepEqual(hit?.value.items, []);
  assert.equal(hit?.fresh, true);
  assert.equal(hit?.fetchedAt, NOW);

  const firstRaw = storage.getItem(key);
  now += 60_000;
  const secondHit = reopened.read(key, "search", isMoleculeSearchData);
  assert.equal(secondHit?.fetchedAt, NOW);
  assert.notEqual(storage.getItem(key), firstRaw, "only last-used metadata should change");
  assert.equal(JSON.parse(storage.getItem(key)).fetchedAt, NOW);
});

test("stale entries survive for background updates but expire from fetch time", () => {
  const storage = new FakeStorage();
  let now = NOW;
  const key = moleculeCacheKey("https://api.example.test/api/v1", "detail", DETAIL_ID);
  const cache = cacheFor(storage, () => now);
  cache.write(key, "detail", molecule(), isMolecule);

  now += MOLECULE_CACHE_DEFAULTS.freshMs;
  const stale = cache.read(key, "detail", isMolecule);
  assert.equal(stale?.fresh, false);
  assert.equal(stale?.value.id, "MS-0000702");

  now = NOW + MOLECULE_CACHE_DEFAULTS.retentionMs - 1000;
  assert.ok(cache.read(key, "detail", isMolecule));
  now = NOW + MOLECULE_CACHE_DEFAULTS.retentionMs;
  assert.equal(cache.read(key, "detail", isMolecule), null);
  assert.equal(storage.getItem(key), null);
});

test("keys have stable parameter order and isolate every result-changing input", () => {
  const first = new URLSearchParams({ sort: "id", limit: "100", offset: "0", q: "C C O", record_status: "ACTIVE", standardization_status: "STANDARDIZED" });
  const reordered = new URLSearchParams({ standardization_status: "STANDARDIZED", record_status: "ACTIVE", q: "C C O", offset: "0", limit: "100", sort: "id" });
  assert.equal(stableMoleculeQuery(first), stableMoleculeQuery(reordered));

  const base = stableMoleculeQuery(first);
  const variants = [
    new URLSearchParams(first),
    new URLSearchParams(first),
    new URLSearchParams(first),
    new URLSearchParams(first),
    new URLSearchParams(first),
    new URLSearchParams(first),
  ];
  variants[0].set("sort", "name");
  variants[1].set("offset", "100");
  variants[2].set("record_status", "DEPRECATED");
  variants[3].set("standardization_status", "FAILED");
  variants[4].set("q", "c c o");
  variants[5].set("q", "CCO");
  for (const variant of variants) assert.notEqual(stableMoleculeQuery(variant), base);

  const key = moleculeCacheKey("https://api.example.test/api/v1", "search", base);
  assert.notEqual(key, moleculeCacheKey("http://localhost:8000/api/v1", "search", base));
  assert.notEqual(key, moleculeCacheKey("https://api.example.test/api/v1", "detail", base));
});

test("corrupt JSON and structurally invalid molecule data are rejected", () => {
  const storage = new FakeStorage();
  const cache = cacheFor(storage);
  const key = moleculeCacheKey("https://api.example.test/api/v1", "detail", DETAIL_ID);
  storage.setItem(key, "{broken");
  assert.equal(cache.read(key, "detail", isMolecule), null);
  assert.equal(storage.getItem(key), null);

  storage.setItem(key, JSON.stringify({
    version: MOLECULE_CACHE_VERSION,
    kind: "detail",
    fetchedAt: NOW,
    lastUsedAt: NOW,
    value: { ...molecule(), properties: [{ key: "broken" }] },
  }));
  assert.equal(cache.read(key, "detail", isMolecule), null);
  assert.equal(storage.getItem(key), null);

  const unrelated = "molscience-search-history";
  storage.setItem(unrelated, "{broken");
  assert.equal(cache.read(key, "detail", isMolecule), null);
  assert.equal(storage.getItem(unrelated), "{broken");
});

test("search records cannot be consumed through the detail resource type", () => {
  const storage = new FakeStorage();
  const cache = cacheFor(storage);
  const key = moleculeCacheKey("https://api.example.test/api/v1", "search", "q=ethanol");
  cache.write(key, "search", searchData(), isMoleculeSearchData);
  assert.equal(cache.read(key, "detail", isMolecule), null);
  assert.equal(storage.getItem(key), null);
});

test("storage denial and quota failures never escape cache operations", () => {
  const storage = new FakeStorage();
  const cache = cacheFor(storage);
  const key = moleculeCacheKey("https://api.example.test/api/v1", "detail", DETAIL_ID);
  storage.failReads = true;
  assert.equal(cache.read(key, "detail", isMolecule), null);
  assert.equal(cache.write(key, "detail", molecule(), isMolecule), false);
  assert.equal(cache.clear(), false);

  storage.failReads = false;
  storage.failWrites = true;
  assert.equal(cache.write(key, "detail", molecule(), isMolecule), false);
  storage.failWrites = false;
  assert.equal(cache.write(key, "detail", molecule(), isMolecule), true);
  storage.failWrites = true;
  assert.doesNotThrow(() => cache.read(key, "detail", isMolecule));
  assert.equal(cache.read(key, "detail", isMolecule)?.value.id, "MS-0000702");
});

test("an individual record over the byte budget is skipped", () => {
  const storage = new FakeStorage();
  const key = moleculeCacheKey("https://api.example.test/api/v1", "detail", DETAIL_ID);
  const value = { ...molecule(), aliases: ["x".repeat(600)] };
  const size = entryBytes(key, "detail", value, NOW);
  const cache = cacheFor(storage, () => NOW, { maxBytes: size - 2 });
  assert.equal(cache.write(key, "detail", value, isMolecule, NOW), false);
  assert.equal(storage.getItem(key), null);
});

test("entry limits evict the least recently used record independently by kind", () => {
  const storage = new FakeStorage();
  let now = NOW;
  const cache = cacheFor(storage, () => now, { maxSearchEntries: 2, maxDetailEntries: 1 });
  const search1 = moleculeCacheKey("api", "search", "one");
  const search2 = moleculeCacheKey("api", "search", "two");
  const search3 = moleculeCacheKey("api", "search", "three");
  cache.write(search1, "search", searchData([molecule("one")]), isMoleculeSearchData, now);
  now += 1000;
  cache.write(search2, "search", searchData([molecule("two")]), isMoleculeSearchData, now);
  now += 1000;
  assert.ok(cache.read(search1, "search", isMoleculeSearchData));
  now += 1000;
  cache.write(search3, "search", searchData([molecule("three")]), isMoleculeSearchData, now);
  assert.ok(cache.read(search1, "search", isMoleculeSearchData));
  assert.equal(cache.read(search2, "search", isMoleculeSearchData), null);
  assert.ok(cache.read(search3, "search", isMoleculeSearchData));

  const detail1 = moleculeCacheKey("api", "detail", "one");
  const detail2 = moleculeCacheKey("api", "detail", "two");
  now += 1000;
  cache.write(detail1, "detail", molecule("one"), isMolecule, now);
  now += 1000;
  cache.write(detail2, "detail", { ...molecule("two"), uuid: "another-uuid" }, isMolecule, now);
  assert.equal(cache.read(detail1, "detail", isMolecule), null);
  assert.ok(cache.read(detail2, "detail", isMolecule));
});

test("the shared byte budget evicts old entries before oversized-but-valid new ones", () => {
  const storage = new FakeStorage();
  const oldKey = moleculeCacheKey("api", "detail", "old");
  const newKey = moleculeCacheKey("api", "detail", "new");
  const oldValue = { ...molecule("old"), uuid: "old" };
  const newValue = { ...molecule("new"), uuid: "new", aliases: ["x".repeat(200)] };
  const newSize = entryBytes(newKey, "detail", newValue, NOW + 1000);
  const oldSize = entryBytes(oldKey, "detail", oldValue, NOW);
  const maxBytes = Math.max(newSize, oldSize) + 100;
  const cache = cacheFor(storage, () => NOW, { maxBytes });

  assert.equal(cache.write(oldKey, "detail", oldValue, isMolecule, NOW), true);
  assert.equal(cache.write(newKey, "detail", newValue, isMolecule, NOW + 1000), true);
  assert.equal(cache.read(oldKey, "detail", isMolecule), null);
  assert.equal(cache.read(newKey, "detail", isMolecule)?.value.uuid, "new");
});

test("default limits retain at most 50 searches and 100 details", () => {
  const storage = new FakeStorage();
  const cache = cacheFor(storage);
  for (let index = 0; index < 51; index += 1) {
    const key = moleculeCacheKey("api", "search", `query-${index}`);
    assert.equal(cache.write(key, "search", searchData([molecule(`search-${index}`)]), isMoleculeSearchData, NOW + index), true);
  }
  for (let index = 0; index < 101; index += 1) {
    const key = moleculeCacheKey("api", "detail", `detail-${index}`);
    assert.equal(cache.write(key, "detail", molecule(`detail-${index}`), isMolecule, NOW + 100 + index), true);
  }

  const records = [...storage.values.entries()].filter(([key]) => key.startsWith(MOLECULE_CACHE_PREFIX)).map(([, raw]) => JSON.parse(raw));
  assert.equal(records.filter(record => record.kind === "search").length, 50);
  assert.equal(records.filter(record => record.kind === "detail").length, 100);
  assert.equal(cache.read(moleculeCacheKey("api", "search", "query-0"), "search", isMoleculeSearchData), null);
  assert.ok(cache.read(moleculeCacheKey("api", "search", "query-50"), "search", isMoleculeSearchData));
  assert.equal(cache.read(moleculeCacheKey("api", "detail", "detail-0"), "detail", isMolecule), null);
  assert.ok(cache.read(moleculeCacheKey("api", "detail", "detail-100"), "detail", isMolecule));
});

test("clear removes only this cache namespace, including older schema versions", () => {
  const storage = new FakeStorage();
  const cache = cacheFor(storage);
  const key = moleculeCacheKey("api", "search", "one");
  assert.equal(cache.write(key, "search", searchData(), isMoleculeSearchData), true);
  storage.setItem(`${MOLECULE_CACHE_PREFIX}v0:legacy`, "old cache");
  storage.setItem("molscience-theme", "dark");
  storage.setItem("molscience-language", "en");
  storage.setItem("molscience-search-history", "[]");
  storage.setItem("unrelated-app", "keep");

  assert.equal(cache.clear(), true);
  assert.equal(storage.getItem(key), null);
  assert.equal(storage.getItem(`${MOLECULE_CACHE_PREFIX}v0:legacy`), null);
  assert.equal(storage.getItem("molscience-theme"), "dark");
  assert.equal(storage.getItem("molscience-language"), "en");
  assert.equal(storage.getItem("molscience-search-history"), "[]");
  assert.equal(storage.getItem("unrelated-app"), "keep");
});

test("search type and ranking isolate cached pages, and match metadata survives", () => {
  const storage = new FakeStorage();
  const cache = cacheFor(storage);
  const smiles = new URLSearchParams({q:"CO",query_type:"smiles",sort:"relevance",offset:"0"});
  const key = moleculeCacheKey("api", "search", stableMoleculeQuery(smiles));
  const formula = new URLSearchParams(smiles); formula.set("query_type", "formula");
  const second = new URLSearchParams(smiles); second.set("offset", "20");
  const value = searchData([{...molecule(), match:{field:"smiles_original",kind:"exact"}}]);
  assert.equal(cache.write(key,"search",value,isMoleculeSearchData),true);
  assert.equal(cache.read(key,"search",isMoleculeSearchData).value.items[0].match.kind,"exact");
  for (const params of [formula,second]) assert.equal(cache.read(moleculeCacheKey("api","search",stableMoleculeQuery(params)),"search",isMoleculeSearchData),null);
  assert.equal(isMolecule({...molecule(),match:{field:"smiles_original",kind:"similarity"}}),false);
  assert.equal(isMolecule({...molecule(),match:{field:"unknown",kind:"exact"}}),false);
  storage.setItem(key,JSON.stringify({version:1,kind:"search",fetchedAt:NOW,lastUsedAt:NOW,value}));
  assert.equal(cache.read(key,"search",isMoleculeSearchData),null);
});
