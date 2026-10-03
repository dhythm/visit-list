import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ApiError, searchFacilities, suggestMunicipalities } from "./api";
import { downloadCsv, facilitiesToCsv } from "./csv";
import { addressLabel, facilityName, industryLabel, mapLink, municipalityLabel } from "./labels";
import type { Facility, PlaceChoice, SavedFacility } from "./types";
import { facilityId, loadSaved, persistSaved, recordFromFacility } from "./storage";

const RADII = [
  { meters: 1000, label: "1 km" },
  { meters: 2000, label: "2 km" },
  { meters: 3000, label: "3 km" },
  { meters: 5000, label: "5 km" },
  { meters: 10000, label: "10 km" },
];

export function App() {
  const [placeQuery, setPlaceQuery] = useState("");
  const [selected, setSelected] = useState<PlaceChoice | null>(null);
  const [keyword, setKeyword] = useState("");
  const [radius, setRadius] = useState(5000);
  const [suggestions, setSuggestions] = useState<PlaceChoice[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState<Facility[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, SavedFacility>>(() => loadSaved());
  const listId = useId();
  const searchRequest = useRef(0);

  useEffect(() => {
    if (selected && placeQuery.trim() === selected.label) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggesting(false);
      setSuggestError(null);
      return;
    }

    const query = placeQuery.trim();
    if (!query) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggesting(false);
      setSuggestError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSuggestions([]);
      setSuggesting(true);
      setSuggestError(null);
      suggestMunicipalities(query, controller.signal)
        .then((places) => {
          if (controller.signal.aborted) return;
          setSuggestions(places);
          setActiveIndex(0);
          setSuggestOpen(true);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setSuggestOpen(true);
          setSuggestError(error instanceof ApiError ? error.message : "候補を取得できませんでした。");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSuggesting(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [placeQuery, selected]);

  function choosePlace(place: PlaceChoice) {
    setSelected(place);
    setPlaceQuery(place.label);
    setSuggestions([]);
    setSuggestOpen(false);
    setSuggestError(null);
    setResults(null);
    setSearchError(null);
  }

  function onPlaceQueryChange(value: string) {
    setPlaceQuery(value);
    if (selected && value.trim() === selected.label) return;
    searchRequest.current += 1;
    setSelected(null);
    setResults(null);
    setSearchError(null);
    setSearching(false);
  }

  function onPlaceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!suggestOpen) setSuggestOpen(suggestions.length > 0);
      setActiveIndex((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Escape") {
      setSuggestOpen(false);
      return;
    }
    if (event.key === "Enter" && suggestOpen && suggestions[activeIndex]) {
      event.preventDefault();
      choosePlace(suggestions[activeIndex]);
    }
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const q = keyword.trim();
    if (!q) return;

    const requestId = searchRequest.current + 1;
    searchRequest.current = requestId;
    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);
    setResults(null);
    try {
      const facilities = await searchFacilities({
        keyword: q,
        center: selected.center,
        radius,
        signal: controller.signal,
      });
      if (searchRequest.current !== requestId) return;
      setResults(facilities);
    } catch (error: unknown) {
      if (searchRequest.current !== requestId) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSearchError(error instanceof ApiError ? error.message : "検索に失敗しました。通信を確認してもう一度お試しください。");
    } finally {
      if (searchRequest.current === requestId) setSearching(false);
    }
  }

  function updateFacility(facility: Facility, patch: { visited?: boolean; memo?: string }) {
    const id = facilityId(facility);
    setSaved((current) => {
      const previous = current[id];
      const nextRecord = recordFromFacility(
        facility,
        patch.visited ?? previous?.visited ?? false,
        patch.memo ?? previous?.memo ?? "",
      );
      const next = { ...current };
      if (!nextRecord.visited && nextRecord.memo.trim() === "") {
        delete next[id];
      } else {
        next[id] = nextRecord;
      }
      persistSaved(next);
      return next;
    });
  }

  function exportCsv() {
    if (!results || results.length === 0) return;
    downloadCsv("訪問リスト.csv", facilitiesToCsv(results, saved, facilityId));
  }

  const hasCenter = selected !== null;
  const canSearch = hasCenter && keyword.trim() !== "" && !searching;
  const hint = !hasCenter
    ? "市区町村を候補から選んでください"
    : keyword.trim() === ""
      ? "業種キーワードを入力してください"
      : `選択中: ${selected.prefecture} ${selected.city}`;

  return (
    <div className="page">
      <header className="site-header">
        <div className="wrap header-inner">
          <h1>訪問リスト</h1>
          <p className="lead">飲食の卸・設備営業向け。市区町村と業種で、今日回る店を決める。</p>
        </div>
      </header>

      <main className="wrap">
        <form className="search-card" onSubmit={onSearch}>
          <div className="search-grid">
            <div className="field">
              <label htmlFor="municipality">市区町村</label>
              <div className="combo">
                <input
                  id="municipality"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={suggestOpen}
                  aria-controls={listId}
                  aria-activedescendant={suggestOpen && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                  aria-describedby="search-hint"
                  value={placeQuery}
                  placeholder="渋谷区、京都市"
                  autoComplete="off"
                  onChange={(event) => onPlaceQueryChange(event.target.value)}
                  onKeyDown={onPlaceKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0 && placeQuery.trim() !== selected?.label) setSuggestOpen(true);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setSuggestOpen(false), 120);
                  }}
                />
                {suggestOpen ? (
                  <ul id={listId} role="listbox" className="suggest-list">
                    {suggesting ? <li className="suggest-status">候補を探しています</li> : null}
                    {suggestError ? <li className="suggest-status">{suggestError}</li> : null}
                    {!suggesting && !suggestError && suggestions.length === 0 ? (
                      <li className="suggest-status">市区町村の候補がありません</li>
                    ) : null}
                    {suggestions.map((place, index) => (
                      <li key={`${place.prefecture}-${place.city}-${place.label}`} role="presentation">
                        <button
                          id={`${listId}-${index}`}
                          type="button"
                          role="option"
                          aria-selected={index === activeIndex}
                          className={index === activeIndex ? "suggest-option is-active" : "suggest-option"}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choosePlace(place)}
                        >
                          <span className="suggest-label">{place.label}</span>
                          <span className="suggest-meta">
                            {place.prefecture}
                            {place.count > 0 ? ` · ${place.count.toLocaleString("ja-JP")}件` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className="field">
              <label htmlFor="keyword">業種</label>
              <input
                id="keyword"
                value={keyword}
                placeholder="ラーメン、カフェ"
                autoComplete="off"
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="radius">半径</label>
              <select id="radius" value={radius} onChange={(event) => setRadius(Number(event.target.value))}>
                {RADII.map((option) => (
                  <option key={option.meters} value={option.meters}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button className="search-button" type="submit" disabled={!canSearch}>
              {searching ? "探しています…" : "探す"}
            </button>
          </div>
          <p id="search-hint" className={hasCenter && keyword.trim() !== "" ? "hint is-selected" : "hint"} role="status">
            {hint}
          </p>
        </form>

        {searchError ? <p className="search-error" role="alert">{searchError}</p> : null}

        {results ? (
          <section className="results" aria-live="polite">
            <div className="list-bar">
              <p className="count">
                {results.length.toLocaleString("ja-JP")}件
                {results.length > 0 ? <span className="count-note">近い順</span> : null}
              </p>
              <button className="csv-button" type="button" onClick={exportCsv} disabled={results.length === 0}>
                CSVを書き出す
              </button>
            </div>
            {results.length === 0 ? (
              <p className="empty">この範囲には見つかりませんでした。半径を広げるか、業種を変えてください。</p>
            ) : (
              <ul className="shop-list">
                {results.map((facility, index) => {
                  const id = facilityId(facility);
                  const record = saved[id];
                  const visited = record?.visited ?? false;
                  const link = mapLink(facility);
                  return (
                    <li key={`${id}:${index}`}>
                      <article className={visited ? "shop-card is-visited" : "shop-card"}>
                        <div className="shop-head">
                          <h2 className="shop-name">{facilityName(facility)}</h2>
                          <span className="industry-pill">{industryLabel(facility)}</span>
                        </div>
                        <p className="shop-address">{addressLabel(facility)}</p>
                        <p className="shop-city">{municipalityLabel(facility)}</p>
                        <div className="shop-actions">
                          {link ? (
                            <a className="map-link" href={link} target="_blank" rel="noreferrer">
                              地図で開く
                            </a>
                          ) : (
                            <span className="no-map">位置なし</span>
                          )}
                          <label className="visited-toggle">
                            <input
                              type="checkbox"
                              checked={visited}
                              onChange={(event) => updateFacility(facility, { visited: event.target.checked })}
                            />
                            訪問済み
                          </label>
                        </div>
                        <input
                          className="memo"
                          type="text"
                          value={record?.memo ?? ""}
                          placeholder="ひとことメモ"
                          aria-label={`${facilityName(facility)}のメモ`}
                          onChange={(event) => updateFacility(facility, { memo: event.target.value })}
                        />
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : searching ? (
          <p className="empty">近い店を探しています。</p>
        ) : (
          <p className="empty">市区町村と業種を選ぶと、今日回る店がカードで並びます。</p>
        )}
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>
            出典:{" "}
            <a href="https://openpoiapi.com/attribution.html">OpenPOI API</a>
          </p>
          <p>カテゴリの半分以上がunknown。閉業が残る。位置がずれることがある。観光案内には使わない。</p>
        </div>
      </footer>
    </div>
  );
}
