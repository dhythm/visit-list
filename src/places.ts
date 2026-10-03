import type { PlaceChoice, VocabularyItem } from "./types";

export function isValidCenter(center: unknown): center is [number, number] {
  if (!Array.isArray(center) || center.length < 2) return false;
  const [lng, lat] = center;
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

function isJapanesePrefecture(value: string): boolean {
  return /(都|道|府|県)$/.test(value.trim());
}

function toChoice(item: VocabularyItem): PlaceChoice {
  const center = item.center as [number, number];
  return {
    label: item.label,
    query: item.query,
    prefecture: item.prefecture?.trim() ?? "",
    city: item.city?.trim() ?? "",
    center: [center[0], center[1]],
    count: item.count ?? 0,
  };
}

export function municipalitiesFromVocabulary(items: VocabularyItem[]): PlaceChoice[] {
  const places = items.filter(
    (item) =>
      item.type === "place" &&
      Boolean(item.city?.trim()) &&
      Boolean(item.label?.trim()) &&
      isValidCenter(item.center),
  );

  const japanese: PlaceChoice[] = [];
  const japaneseKeys = new Set<string>();
  const labelsWithJapanese = new Set<string>();

  for (const item of places) {
    const prefecture = item.prefecture?.trim() ?? "";
    const city = item.city?.trim() ?? "";
    if (!isJapanesePrefecture(prefecture)) continue;
    labelsWithJapanese.add(item.label);
    const key = `${prefecture}\n${city}`;
    if (japaneseKeys.has(key)) {
      const index = japanese.findIndex((place) => place.prefecture === prefecture && place.city === city);
      if (index >= 0 && (item.count ?? 0) > japanese[index].count) {
        japanese[index] = toChoice(item);
      }
      continue;
    }
    japaneseKeys.add(key);
    japanese.push(toChoice(item));
  }

  const fallback: PlaceChoice[] = [];
  const fallbackLabels = new Set<string>();
  for (const item of places) {
    const prefecture = item.prefecture?.trim() ?? "";
    if (isJapanesePrefecture(prefecture)) continue;
    if (labelsWithJapanese.has(item.label)) continue;
    if (fallbackLabels.has(item.label)) {
      const index = fallback.findIndex((place) => place.label === item.label);
      if (index >= 0 && (item.count ?? 0) > fallback[index].count) {
        fallback[index] = toChoice(item);
      }
      continue;
    }
    fallbackLabels.add(item.label);
    fallback.push(toChoice(item));
  }

  return [...japanese, ...fallback];
}
