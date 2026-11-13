import type { Molecule, Property, RecordValue } from "./data";

export const MOLECULE_CACHE_PREFIX = "molscience-public-data:";
export const MOLECULE_CACHE_VERSION = 1;
export const MOLECULE_CACHE_DEFAULTS = {
  freshMs: 24 * 60 * 60 * 1000,
  retentionMs: 7 * 24 * 60 * 60 * 1000,
  maxSearchEntries: 50,
  maxDetailEntries: 100,
  maxBytes: 2 * 1024 * 1024,
} as const;

export type MoleculeCacheKind = "search" | "detail";
export type MoleculePagination = {
  offset: number;
  limit: number;
  has_more: boolean;
  next_offset: number | null;
};
export type MoleculeSearchData = {
  items: Molecule[];
  pagination: MoleculePagination;
};
export type MoleculeCacheRead<T> = {
  value: T;
  fetchedAt: number;
  fresh: boolean;
};

type CacheRecord = {
  version: number;
  kind: MoleculeCacheKind;
  fetchedAt: number;
  lastUsedAt: number;
  value: unknown;
};

type StoredEntry = CacheRecord & { key: string; raw: string };
type StorageLike = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;
type CacheOptions = {
  storage?: StorageLike;
  now?: () => number;
  freshMs?: number;
  retentionMs?: number;
  maxSearchEntries?: number;
  maxDetailEntries?: number;
  maxBytes?: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isLocalizedText(value: unknown): boolean {
  return isObject(value) && typeof value.zh === "string" && typeof value.en === "string";
}

function isRecordValue(value: unknown): value is RecordValue {
  if (!isObject(value)) return false;
  return isOptionalString(value.id)
    && typeof value.value === "string"
    && isOptionalString(value.rawValue)
    && typeof value.condition === "string"
    && typeof value.source === "string"
    && isOptionalString(value.sourceCode)
    && isOptionalString(value.sourceRecordKey)
    && (value.quality === undefined || ["recommended", "high", "standard"].includes(String(value.quality)))
    && isOptionalString(value.method)
    && isOptionalString(value.origin)
    && isOptionalString(value.qualifier)
    && (value.reviewStatus === undefined || ["PENDING", "ACCEPTED", "REJECTED"].includes(String(value.reviewStatus)));
}

function isProperty(value: unknown): value is Property {
  if (!isObject(value)) return false;
  return typeof value.key === "string"
    && isLocalizedText(value.label)
    && typeof value.value === "string"
    && typeof value.condition === "string"
    && Array.isArray(value.records)
    && value.records.every(isRecordValue)
    && isOptionalString(value.unit)
    && isOptionalString(value.origin)
    && (value.reviewStatus === undefined || ["PENDING", "ACCEPTED", "REJECTED"].includes(String(value.reviewStatus)));
}

export function isMolecule(value: unknown): value is Molecule {
  if (!isObject(value)) return false;
  const validSafety = isObject(value.safety)
    && ["danger", "warning", "info"].includes(String(value.safety.level))
    && isLocalizedText(value.safety.label)
    && Array.isArray(value.safety.zh)
    && value.safety.zh.every(item => typeof item === "string")
    && Array.isArray(value.safety.en)
    && value.safety.en.every(item => typeof item === "string");
  return isOptionalString(value.uuid)
    && typeof value.id === "string"
    && typeof value.cid === "number"
    && Number.isFinite(value.cid)
    && typeof value.inchikey === "string"
    && isLocalizedText(value.name)
    && typeof value.iupac === "string"
    && Array.isArray(value.aliases)
    && value.aliases.every(item => typeof item === "string")
    && typeof value.formula === "string"
    && typeof value.mass === "string"
    && typeof value.cas === "string"
    && typeof value.smiles === "string"
    && typeof value.inchi === "string"
    && isLocalizedText(value.description)
    && Array.isArray(value.categories)
    && value.categories.every(item => ["numeric", "spectra", "safety"].includes(String(item)))
    && Array.isArray(value.sources)
    && value.sources.every(item => typeof item === "string")
    && Array.isArray(value.properties)
    && value.properties.every(isProperty)
    && Array.isArray(value.spectra)
    && value.spectra.every(item => typeof item === "string")
    && validSafety
    && (value.standardizationStatus === undefined || ["PENDING", "STANDARDIZED", "FAILED"].includes(String(value.standardizationStatus)))
    && isOptionalString(value.standardizationVersion)
    && (value.recordStatus === undefined || ["ACTIVE", "DEPRECATED", "DELETED"].includes(String(value.recordStatus)))
    && isOptionalString(value.createdAt)
    && isOptionalString(value.updatedAt);
}

export function isMoleculeSearchData(value: unknown): value is MoleculeSearchData {
  if (!isObject(value) || !Array.isArray(value.items) || !value.items.every(isMolecule) || !isObject(value.pagination)) {
    return false;
  }
  const pagination = value.pagination;
  return Number.isInteger(pagination.offset)
    && Number(pagination.offset) >= 0
    && Number.isInteger(pagination.limit)
    && Number(pagination.limit) > 0
    && typeof pagination.has_more === "boolean"
    && (pagination.next_offset === null || (Number.isInteger(pagination.next_offset) && Number(pagination.next_offset) >= 0));
}

export function stableMoleculeQuery(params: URLSearchParams): string {
  const sorted = new URLSearchParams(params);
  sorted.sort();
  return sorted.toString();
}

export function moleculeCacheKey(
  apiBaseUrl: string,
  kind: MoleculeCacheKind,
  identity: string,
): string {
  return `${MOLECULE_CACHE_PREFIX}v${MOLECULE_CACHE_VERSION}:${kind}:${apiBaseUrl}:${identity}`;
}

function stringBytes(value: string): number {
  return value.length * 2;
}

function isCacheRecord(value: unknown): value is CacheRecord {
  return isObject(value)
    && value.version === MOLECULE_CACHE_VERSION
    && (value.kind === "search" || value.kind === "detail")
    && typeof value.fetchedAt === "number"
    && Number.isFinite(value.fetchedAt)
    && value.fetchedAt >= 0
    && typeof value.lastUsedAt === "number"
    && Number.isFinite(value.lastUsedAt)
    && value.lastUsedAt >= 0
    && Object.prototype.hasOwnProperty.call(value, "value");
}

function newestFirst(a: StoredEntry, b: StoredEntry): number {
  return b.lastUsedAt - a.lastUsedAt || b.fetchedAt - a.fetchedAt || a.key.localeCompare(b.key);
}

export function createMoleculeCache(options: CacheOptions = {}) {
  const now = options.now ?? Date.now;
  const freshMs = options.freshMs ?? MOLECULE_CACHE_DEFAULTS.freshMs;
  const retentionMs = options.retentionMs ?? MOLECULE_CACHE_DEFAULTS.retentionMs;
  const maxSearchEntries = options.maxSearchEntries ?? MOLECULE_CACHE_DEFAULTS.maxSearchEntries;
  const maxDetailEntries = options.maxDetailEntries ?? MOLECULE_CACHE_DEFAULTS.maxDetailEntries;
  const maxBytes = options.maxBytes ?? MOLECULE_CACHE_DEFAULTS.maxBytes;

  function getStorage(): StorageLike {
    return options.storage ?? window.localStorage;
  }

  function read<T>(
    key: string,
    kind: MoleculeCacheKind,
    validate: (value: unknown) => value is T,
  ): MoleculeCacheRead<T> | null {
    try {
      const storage = getStorage();
      const raw = storage.getItem(key);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isCacheRecord(parsed) || parsed.kind !== kind) {
        storage.removeItem(key);
        return null;
      }
      const timestamp = now();
      if (timestamp - parsed.fetchedAt >= retentionMs || !validate(parsed.value)) {
        storage.removeItem(key);
        return null;
      }
      const touched: CacheRecord = { ...parsed, lastUsedAt: timestamp };
      try {
        storage.setItem(key, JSON.stringify(touched));
      } catch {
        // A read remains usable when a persistence touch is not permitted.
      }
      return {
        value: parsed.value,
        fetchedAt: parsed.fetchedAt,
        fresh: timestamp - parsed.fetchedAt < freshMs,
      };
    } catch {
      try { getStorage().removeItem(key); } catch { /* Storage is optional. */ }
      return null;
    }
  }

  function write<T>(
    key: string,
    kind: MoleculeCacheKind,
    value: T,
    validate: (value: unknown) => value is T,
    fetchedAt = now(),
  ): boolean {
    try {
      if (!validate(value)) return false;
      const storage = getStorage();
      const record: CacheRecord = { version: MOLECULE_CACHE_VERSION, kind, fetchedAt, lastUsedAt: fetchedAt, value };
      const raw = JSON.stringify(record);
      if (stringBytes(key) + stringBytes(raw) > maxBytes) {
        storage.removeItem(key);
        return false;
      }

      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const storedKey = storage.key(index);
        if (storedKey?.startsWith(MOLECULE_CACHE_PREFIX)) keys.push(storedKey);
      }
      const entries: StoredEntry[] = [];
      for (const storedKey of keys) {
        if (storedKey === key) continue;
        const storedRaw = storage.getItem(storedKey);
        if (storedRaw === null) continue;
        try {
          const parsed: unknown = JSON.parse(storedRaw);
          if (!isCacheRecord(parsed) || now() - parsed.fetchedAt >= retentionMs) {
            storage.removeItem(storedKey);
            continue;
          }
          entries.push({ ...parsed, key: storedKey, raw: storedRaw });
        } catch {
          storage.removeItem(storedKey);
        }
      }

      const candidate: StoredEntry = { ...record, key, raw };
      const withinCountLimits = new Set<string>();
      for (const entryKind of ["search", "detail"] as const) {
        const limit = entryKind === "search" ? maxSearchEntries : maxDetailEntries;
        for (const entry of [...entries, candidate].filter(item => item.kind === entryKind).sort(newestFirst).slice(0, limit)) {
          withinCountLimits.add(entry.key);
        }
      }

      const kept = new Set<string>();
      let totalBytes = 0;
      for (const entry of [...entries, candidate].filter(item => withinCountLimits.has(item.key)).sort(newestFirst)) {
        const size = stringBytes(entry.key) + stringBytes(entry.raw);
        if (totalBytes + size > maxBytes) continue;
        totalBytes += size;
        kept.add(entry.key);
      }
      if (!kept.has(key)) return false;

      for (const entry of entries) {
        if (!kept.has(entry.key)) storage.removeItem(entry.key);
      }
      storage.setItem(key, raw);
      return true;
    } catch {
      return false;
    }
  }

  function remove(key: string): boolean {
    try {
      getStorage().removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function clear(): boolean {
    try {
      const storage = getStorage();
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(MOLECULE_CACHE_PREFIX)) keys.push(key);
      }
      for (const key of keys) storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  return { read, write, remove, clear };
}

export const moleculeCache = createMoleculeCache();

export function clearMoleculeCache(): boolean {
  return moleculeCache.clear();
}
