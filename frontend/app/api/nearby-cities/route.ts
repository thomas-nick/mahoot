import { NextResponse } from "next/server";

type FacetCountEntry = {
  value?: string | number | boolean;
  count?: number;
};

type TypesenseFacetCount = {
  field_name?: string;
  counts?: FacetCountEntry[];
};

type SearchResult = {
  facet_counts?: TypesenseFacetCount[];
};

function getTypesenseConfig() {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = process.env.TYPESENSE_PORT ?? "8108";
  const protocol = process.env.TYPESENSE_PROTOCOL ?? "http";

  if (!host || !apiKey) {
    return null;
  }

  return { host, port, protocol, apiKey };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Missing or invalid lat/lng" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Coordinates out of range" }, { status: 400 });
  }

  const config = getTypesenseConfig();
  if (!config) {
    return NextResponse.json({ error: "Typesense is not configured on the server." }, { status: 503 });
  }

  const { host, port, protocol, apiKey } = config;
  const filterBy = `location:(${lat},${lng},50 mi)`;
  const params = new URLSearchParams({
    q: "*",
    query_by: "name",
    per_page: "0",
    facet_by: "city",
    max_facet_values: "30",
    filter_by: filterBy,
  });

  const url = `${protocol}://${host}:${port}/collections/courses/documents/search?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-TYPESENSE-API-KEY": apiKey,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Typesense error: ${res.status}`, detail: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as SearchResult;
    const cityFacet = data.facet_counts?.find((f) => f.field_name === "city");
    const cities =
      cityFacet?.counts
        ?.map((c) => ({
          city: String(c.value ?? "").trim(),
          count: Number(c.count ?? 0),
        }))
        .filter((c) => c.city.length > 0 && c.count > 0)
        .sort((a, b) => b.count - a.count) ?? [];

    return NextResponse.json({ cities });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
