"use client";

import type { WorldsEdition, WorldsProducer, WorldsVideo } from "../_lib/worldsCoverageTypes";

const SOURCE_SHORT: Record<WorldsProducer, string> = {
  jomezpro: "JP",
  gkpro: "GK",
  gatekeeper: "GKM",
  ccdg: "CCD",
};

const SOURCE_ACCENT: Record<WorldsProducer, string> = {
  jomezpro: "#c2410c",
  gkpro: "#2563eb",
  gatekeeper: "#7c3aed",
  ccdg: "#0d9488",
};

function videoMeta(v: WorldsVideo): string {
  const parts: string[] = [v.source_label];
  if (v.division) parts.push(v.division);
  if (v.round != null) parts.push(`R${v.round}${v.half ?? ""}`);
  else if (v.is_round) parts.push("round");
  if (v.card_type && v.card_type !== "unknown") parts.push(v.card_type);
  if (v.content_type !== "round") parts.push(v.content_type_label);
  if (v.upload_date) parts.push(v.upload_date);
  return parts.join(" · ");
}

function groupVideosByProducer(videos: WorldsVideo[]): Array<{ source: WorldsProducer; label: string; videos: WorldsVideo[] }> {
  const order: WorldsProducer[] = ["ccdg", "jomezpro", "gatekeeper", "gkpro"];
  const map = new Map<WorldsProducer, WorldsVideo[]>();
  for (const v of videos) {
    const list = map.get(v.source) ?? [];
    list.push(v);
    map.set(v.source, list);
  }
  return order
    .filter((s) => map.has(s))
    .map((source) => ({
      source,
      label: videos.find((v) => v.source === source)?.source_label ?? source,
      videos: (map.get(source) ?? []).sort((a, b) => {
        const roundA = a.round ?? (a.is_round ? 0 : 99);
        const roundB = b.round ?? (b.is_round ? 0 : 99);
        if (roundA !== roundB) return roundA - roundB;
        return (a.upload_date ?? "").localeCompare(b.upload_date ?? "");
      }),
    }));
}

type Props = {
  editions: WorldsEdition[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function WorldsEditionList({ editions, selectedId, onSelect }: Props) {
  if (!editions.length) {
    return (
      <div className="asia-empty">
        <p>No editions match these filters.</p>
        <p className="asia-empty-sub">Try another year, producer, or championship type.</p>
      </div>
    );
  }

  const leader = editions[0]?.round_count || editions[0]?.video_count || 1;

  return (
    <ul className="clean-list player-tour-list worlds-edition-list">
      {editions.map((edition, index) => {
        const isOpen = selectedId === edition.id;
        const rank = index + 1;
        const metric = edition.round_count || edition.video_count;
        const barWidth = leader ? (metric / leader) * 100 : 0;

        return (
          <li key={edition.id} className={`clean-item ${isOpen ? "clean-item-open" : ""}`}>
            <button
              type="button"
              className="clean-row player-tour-row asia-row"
              onClick={() => onSelect(isOpen ? null : edition.id)}
              aria-expanded={isOpen}
            >
              <span className={`clean-rank ${rank === 1 ? "clean-rank-leader" : ""}`}>{rank}</span>
              <span className="asia-flag worlds-edition-year" aria-hidden>
                {edition.year?.slice(2) ?? "—"}
              </span>
              <div className="clean-meta">
                <p className="clean-name">{edition.worlds_type_label}</p>
                <p className="clean-sub">
                  {edition.producer_labels.join(" · ")}
                  {edition.round_count > 0 && ` · ${edition.round_count} round videos`}
                </p>
                <div className="clean-bar-track" aria-hidden>
                  <div
                    className="clean-bar-fill"
                    style={{ width: `${Math.min(barWidth, 100)}%`, backgroundColor: "var(--accent)" }}
                  />
                </div>
              </div>
              <div className="clean-stat-block">
                <span className="clean-stat">{edition.round_count || edition.video_count}</span>
                <span className="clean-stat-label">{edition.round_count ? "rounds" : "videos"}</span>
              </div>
              <span className="clean-row-chevron" aria-hidden>{isOpen ? "▾" : "▸"}</span>
            </button>

            {isOpen && (
              <div className="clean-detail worlds-edition-detail">
                <div className="worlds-producer-pills">
                  {edition.producers.map((source) => (
                    <span
                      key={source}
                      className="worlds-producer-pill"
                      style={{ borderColor: SOURCE_ACCENT[source], color: SOURCE_ACCENT[source] }}
                    >
                      {SOURCE_SHORT[source]} {edition.by_producer[source] ?? 0}
                    </span>
                  ))}
                </div>

                {groupVideosByProducer(edition.videos).map(({ source, label, videos }) => (
                  <div key={source} className="worlds-producer-group">
                    <p className="worlds-producer-group-label" style={{ color: SOURCE_ACCENT[source] }}>
                      {label}
                    </p>
                    <ul className="worlds-video-list">
                      {videos.map((v) => (
                        <li key={v.id}>
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="worlds-video-link"
                          >
                            <span className="worlds-video-title">{v.title}</span>
                            <span className="worlds-video-meta">{videoMeta(v)}</span>
                            {v.players.length > 0 && (
                              <span className="worlds-video-players">{v.players.join(", ")}</span>
                            )}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
