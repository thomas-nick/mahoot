import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();

const clean = (value: string | null) => (value ?? "").trim();

const safeJson = async <T>(response: Response) => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = clean(searchParams.get("kind"));
  const name = clean(searchParams.get("name"));
  const brand = clean(searchParams.get("brand"));
  const city = clean(searchParams.get("city"));
  const state = clean(searchParams.get("state"));
  const speedRaw = clean(searchParams.get("speed"));

  if (!name || (kind !== "disc" && kind !== "course")) {
    return NextResponse.json({ suggestions: [] });
  }

  if (kind === "disc") {
    const speed = Number(speedRaw);
    const hasSpeed = Number.isFinite(speed);
    const query = new URLSearchParams({
      "pagination[pageSize]": "6",
      "sort[0]": "name:asc",
      "filters[name][$containsi]": name,
      "fields[0]": "name",
      "fields[1]": "brand",
      "fields[2]": "speed",
      "fields[3]": "glide",
      "fields[4]": "turn",
      "fields[5]": "fade",
      status: "published",
    });
    if (brand) {
      query.set("filters[brand][$containsi]", brand);
    }
    if (hasSpeed) {
      query.set("filters[speed][$gte]", String(speed - 1));
      query.set("filters[speed][$lte]", String(speed + 1));
    }

    const response = await fetch(`${STRAPI_URL}/api/discs?${query.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }
    const json = await safeJson<{ data?: Array<{ documentId?: string; name?: string; brand?: string; speed?: number }> }>(
      response
    );
    const suggestions = (json?.data ?? []).map((item) => ({
      id: item.documentId || "",
      label: [item.brand, item.name].filter(Boolean).join(" "),
      meta: item.speed != null ? `speed ${item.speed}` : "",
    }));
    return NextResponse.json({ suggestions: suggestions.filter((item) => item.id) });
  }

  const query = new URLSearchParams({
    "pagination[pageSize]": "6",
    "sort[0]": "name:asc",
    "filters[name][$containsi]": name,
    "fields[0]": "name",
    "fields[1]": "city",
    "fields[2]": "state",
    status: "published",
  });
  if (city) {
    query.set("filters[city][$containsi]", city);
  }
  if (state) {
    query.set("filters[state][$containsi]", state);
  }

  const response = await fetch(`${STRAPI_URL}/api/courses?${query.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ suggestions: [] });
  }
  const json = await safeJson<{ data?: Array<{ documentId?: string; name?: string; city?: string; state?: string }> }>(
    response
  );
  const suggestions = (json?.data ?? []).map((item) => ({
    id: item.documentId || "",
    label: item.name || "(Untitled)",
    meta: [item.city, item.state].filter(Boolean).join(", "),
  }));
  return NextResponse.json({ suggestions: suggestions.filter((item) => item.id) });
}
