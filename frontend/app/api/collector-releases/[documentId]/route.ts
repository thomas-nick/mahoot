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

const getUserJwt = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
};

const ensureConfirmedUser = async (strapiUrl: string, userJwt: string) => {
  const meResponse = await fetch(`${strapiUrl}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${userJwt}`,
    },
    cache: "no-store",
  });
  if (!meResponse.ok) {
    return { ok: false as const, status: 401, error: "Session expired. Please log in again." };
  }
  const me = (await meResponse.json()) as { confirmed?: boolean };
  if (!me.confirmed) {
    return { ok: false as const, status: 403, error: "Please verify your email first." };
  }
  return { ok: true as const };
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const strapiUrl = getStrapiServerUrl();
  const userJwt = getUserJwt(request);
  if (!userJwt) {
    return NextResponse.json({ error: "Please log in to edit collector runs." }, { status: 401 });
  }

  const { documentId } = await params;
  if (!documentId) {
    return NextResponse.json({ error: "Missing collector release id." }, { status: 400 });
  }

  const authCheck = await ensureConfirmedUser(strapiUrl, userJwt);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = (await request.json()) as {
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

    const runName = (body.runName ?? "").trim();
    const year = toOptionalYear(body.year);
    const oopStatus = (body.oopStatus ?? "").trim();
    const collectorValue = toTenBarScore(body.collectorValue);
    const rarity = toTenBarScore(body.rarity);
    const soughtAfter = toTenBarScore(body.soughtAfter);
    const priceLowUsd = toOptionalDecimal(body.priceLowUsd);
    const priceHighUsd = toOptionalDecimal(body.priceHighUsd);

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

    const payload = {
      data: {
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

    const response = await fetch(`${strapiUrl}/api/collector-releases/${encodeURIComponent(documentId)}`, {
      method: "PUT",
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
        { error: `Collector run update failed (${response.status}): ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const updated = await response.json();
    return NextResponse.json({ ok: true, release: updated?.data ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const strapiUrl = getStrapiServerUrl();
  const userJwt = getUserJwt(request);
  if (!userJwt) {
    return NextResponse.json({ error: "Please log in to delete collector runs." }, { status: 401 });
  }

  const { documentId } = await params;
  if (!documentId) {
    return NextResponse.json({ error: "Missing collector release id." }, { status: 400 });
  }

  const authCheck = await ensureConfirmedUser(strapiUrl, userJwt);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const response = await fetch(`${strapiUrl}/api/collector-releases/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${userJwt}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Collector run delete failed (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
