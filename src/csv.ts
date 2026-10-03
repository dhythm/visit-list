import { addressLabel, facilityName, industryLabel, mapLink, municipalityLabel } from "./labels";
import type { Facility, SavedFacility } from "./types";

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function facilitiesToCsv(facilities: Facility[], saved: Record<string, SavedFacility>, idOf: (facility: Facility) => string): string {
  const header = ["施設名", "業種", "住所", "市区町村", "地図", "訪問済み", "メモ"];
  const rows = facilities.map((facility) => {
    const record = saved[idOf(facility)];
    return [
      facilityName(facility),
      industryLabel(facility),
      addressLabel(facility),
      municipalityLabel(facility),
      mapLink(facility) ?? "",
      record?.visited ? "訪問済み" : "未訪問",
      record?.memo ?? "",
    ];
  });
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(","));
  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
