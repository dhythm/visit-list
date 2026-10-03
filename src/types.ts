export type VocabularyItem = {
  type: "category" | "brand" | "place" | string;
  label: string;
  query: string;
  prefecture?: string;
  city?: string;
  center?: number[];
  bbox?: number[];
  count?: number;
};

export type SuggestResponse = {
  count: number;
  scope?: "view" | "nationwide" | string;
  suggestions?: unknown[];
  vocabulary?: VocabularyItem[];
  completion?: string | null;
};

export type Facility = {
  name?: string;
  name_kana?: string;
  prefecture?: string;
  city?: string;
  address?: string;
  category?: string;
  business_type?: string;
  lat?: number | string;
  lng?: number | string;
  level?: number | string | null;
  source?: string;
  licenses?: string[];
  attributions?: string[];
};

export type SearchResponse = {
  count: number;
  results: Facility[];
};

export type PlaceChoice = {
  label: string;
  query: string;
  prefecture: string;
  city: string;
  center: [number, number];
  count: number;
};

export type SavedFacility = {
  id: string;
  name: string;
  prefecture: string;
  city: string;
  address: string;
  category: string;
  business_type: string;
  lat: number | null;
  lng: number | null;
  licenses: string[];
  attributions: string[];
  visited: boolean;
  memo: string;
};
