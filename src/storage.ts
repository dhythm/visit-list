import { coordinatePair } from "./labels";
import type { Facility, SavedFacility } from "./types";

const STORAGE_KEY = "visit-list.facilities.v1";

export function facilityId(facility: Facility): string {
  const coords = coordinatePair(facility);
  return [
    facility.name?.trim() ?? "",
    facility.prefecture?.trim() ?? "",
    facility.city?.trim() ?? "",
    facility.address?.trim() ?? "",
    coords ? String(coords.lat) : "",
    coords ? String(coords.lng) : "",
  ].join("\u001f");
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeRecord(value: unknown): SavedFacility | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<SavedFacility>;
  if (typeof record.id !== "string" || !record.id) return null;
  const coords =
    typeof record.lat === "number" && typeof record.lng === "number"
      ? { lat: record.lat, lng: record.lng }
      : { lat: null, lng: null };
  return {
    id: record.id,
    name: typeof record.name === "string" ? record.name : "",
    prefecture: typeof record.prefecture === "string" ? record.prefecture : "",
    city: typeof record.city === "string" ? record.city : "",
    address: typeof record.address === "string" ? record.address : "",
    category: typeof record.category === "string" ? record.category : "",
    business_type: typeof record.business_type === "string" ? record.business_type : "",
    lat: coords.lat,
    lng: coords.lng,
    licenses: asStringArray(record.licenses),
    attributions: asStringArray(record.attributions),
    visited: Boolean(record.visited),
    memo: typeof record.memo === "string" ? record.memo : "",
  };
}

export function loadSaved(): Record<string, SavedFacility> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const saved: Record<string, SavedFacility> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const record = normalizeRecord(value);
      if (record) saved[key] = record;
    }
    return saved;
  } catch {
    return {};
  }
}

export function persistSaved(saved: Record<string, SavedFacility>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

export function recordFromFacility(
  facility: Facility,
  visited: boolean,
  memo: string,
): SavedFacility {
  const coords = coordinatePair(facility);
  return {
    id: facilityId(facility),
    name: facility.name?.trim() ?? "",
    prefecture: facility.prefecture?.trim() ?? "",
    city: facility.city?.trim() ?? "",
    address: facility.address?.trim() ?? "",
    category: facility.category?.trim() ?? "",
    business_type: facility.business_type?.trim() ?? "",
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    licenses: asStringArray(facility.licenses),
    attributions: asStringArray(facility.attributions),
    visited,
    memo,
  };
}
