import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const toTenBarScore = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    return NaN;
  }
  return parsed;
};

const toOptionalDecimal = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return NaN;
  }
  return parsed;
};

const toOptionalYear = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) {
    return NaN;
  }
  return parsed;
};

const allowedStatuses = new Set(["in-production", "oop", "limited-run", "tour-series"]);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export async function POST(request: Request) {
  const strapiUrl = getStrapiServerUrl();
  const authHeader = request.headers.get("authorization");
  const userJwt = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!userJwt) {
    return NextResponse.json({ error: "Please log in to add collector runs." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      discDocumentId?: string;
      discExternalId?: string;
      discName?: string;
      runName?: string;
      year?: number;
      oopStatus?: string;
      collectorValue?: number;
      rarity?: number;
      soughtAfter?: number;
      priceLowUsd?: number;
      priceHighUsd?: number;
      imageUrl?: string;
      notes?: string;
    };

    const discDocumentId = (body.discDocumentId ?? "").trim();
    const runName = (body.runName ?? "").trim();
    const year = toOptionalYear(body.year);
    const oopStatus = (body.oopStatus ?? "").trim();
    const collectorValue = toTenBarScore(body.collectorValue);
    const rarity = toTenBarScore(body.rarity);
    const soughtAfter = toTenBarScore(body.soughtAfter);
    const priceLowUsd = toOptionalDecimal(body.priceLowUsd);
    const priceHighUsd = toOptionalDecimal(body.priceHighUsd);

    if (!discDocumentId) {
      return NextResponse.json({ error: "discDocumentId is required." }, { status: 400 });
    }
    if (!runName) {
      return NextResponse.json({ error: "runName is required." }, { status: 400 });
    }
    if (Number.isNaN(year)) {
      return NextResponse.json({ error: "year must be an integer between 1900 and 2100." }, { status: 400 });
    }
    if (oopStatus && !allowedStatuses.has(oopStatus)) {
      return NextResponse.json({ error: "Invalid oopStatus value." }, { status: 400 });
    }
    if ([collectorValue, rarity, soughtAfter].some((value) => Number.isNaN(value))) {
      return NextResponse.json(
        { error: "collectorValue, rarity, and soughtAfter must be integers from 1 to 10." },
        { status: 400 },
      );
    }
    if ([priceLowUsd, priceHighUsd].some((value) => Number.isNaN(value))) {
      return NextResponse.json({ error: "price fields must be valid numbers." }, { status: 400 });
    }

    const meResponse = await fetch(`${strapiUrl}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
      cache: "no-store",
    });
    if (!meResponse.ok) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }

    const me = (await meResponse.json()) as { confirmed?: boolean };
    if (!me.confirmed) {
      return NextResponse.json(
        { error: "Please verify your email before adding collector runs." },
        { status: 403 },
      );
    }

    const extBase = [
      (body.discExternalId ?? "").trim() || discDocumentId,
      year,
      slugify(runName),
    ]
      .filter(Boolean)
      .join("-");

    const payload = {
      data: {
        externalId: extBase || null,
        discDocumentId,
        discExternalId: (body.discExternalId ?? "").trim() || null,
        discName: (body.discName ?? "").trim() || null,
        runName,
        year,
        oopStatus: oopStatus || "in-production",
        collectorValue,
        rarity,
        soughtAfter,
        priceLowUsd,
        priceHighUsd,
        imageUrl: (body.imageUrl ?? "").trim() || null,
        notes: (body.notes ?? "").trim() || null,
      },
    };

    const response = await fetch(`${strapiUrl}/api/collector-releases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userJwt}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `Collector release submit failed (${response.status}): ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const created = await response.json();
    return NextResponse.json({
      ok: true,
      release: created?.data ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
