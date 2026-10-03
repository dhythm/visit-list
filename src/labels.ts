import type { Facility } from "./types";

const CATEGORY_LABELS: Record<string, string> = {
  unknown: "業種不明",
  restaurant: "飲食",
  cafe: "カフェ",
  coffee: "カフェ",
  bar: "バー",
  bakery: "ベーカリー",
  grocery: "食料品",
  fast_food: "ファストフード",
  food: "食品",
  convenience: "コンビニ",
  supermarket: "スーパー",
  liquor: "酒店",
  service_other: "その他サービス",
  retail_other: "その他小売",
  hotel: "宿泊",
  education: "教育",
  school: "学校",
  hospital: "病院",
  pharmacy: "薬局",
  beauty: "美容",
  shopping: "物販",
};

export function industryLabel(facility: Facility): string {
  const raw = (facility.business_type || facility.category || "").trim();
  if (!raw) return "業種不明";
  return CATEGORY_LABELS[raw] ?? raw;
}

export function facilityName(facility: Facility): string {
  const name = facility.name?.trim();
  return name ? name : "名称なし";
}

export function municipalityLabel(facility: Facility): string {
  const prefecture = facility.prefecture?.trim() ?? "";
  const city = facility.city?.trim() ?? "";
  if (prefecture && city) return `${prefecture} ${city}`;
  return city || prefecture || "市区町村不明";
}

export function addressLabel(facility: Facility): string {
  const address = facility.address?.trim();
  return address ? address : "住所の記載なし";
}

export function coordinatePair(facility: Facility): { lat: number; lng: number } | null {
  const lat = typeof facility.lat === "number" ? facility.lat : Number(facility.lat);
  const lng = typeof facility.lng === "number" ? facility.lng : Number(facility.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function mapLink(facility: Facility): string | null {
  const coords = coordinatePair(facility);
  if (!coords) return null;
  const params = new URLSearchParams({
    api: "1",
    query: `${coords.lat},${coords.lng}`,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
