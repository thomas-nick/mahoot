import { notFound } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import { AsiaEventDetailView } from "../../../_components/AsiaEventDetail";
import { SiteNav } from "../../../_components/SiteNav";
import type { AsiaEventDetail } from "../../../_lib/asiaTypes";

export const dynamic = "force-static";

async function loadEvent(id: string): Promise<AsiaEventDetail | null> {
  if (!/^\d+$/.test(id)) return null;
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "leaderboards",
    "asia_events",
    `${id}.json`,
  );
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as AsiaEventDetail;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const dir = path.join(process.cwd(), "public", "data", "leaderboards", "asia_events");
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ id: f.replace(/\.json$/, "") }));
  } catch {
    return [];
  }
}

export default async function AsiaEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await loadEvent(id);
  if (!event) notFound();

  return (
    <div className="page-content theme-clean mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <SiteNav />
      <AsiaEventDetailView event={event} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await loadEvent(id);
  if (!event) {
    return { title: "Event not found" };
  }
  const winnerMpo = event.mpo[0];
  const summary = winnerMpo
    ? `${event.location} · ${event.dates} · ${event.field_size} players · winner: ${winnerMpo.name.replace(/\s#\d+$/, "")}`
    : `${event.location} · ${event.dates} · ${event.field_size} players`;
  return {
    title: event.title,
    description: summary,
    openGraph: {
      title: event.title,
      description: summary,
    },
  };
}
