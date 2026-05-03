import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const strapiUrl = getStrapiServerUrl();

const allowedConditions = new Set(["new", "like-new", "used", "inked", "unknown"]);
const allowedShipping = new Set([
  "ships-us-only",
  "ships-international",
  "local-pickup",
  "ships-and-pickup",
]);

const getTypesenseConfig = () => {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = process.env.TYPESENSE_PORT ?? "8108";
  const protocol = process.env.TYPESENSE_PROTOCOL ?? "http";
  if (!host || !apiKey) {
    return null;
  }
  return { host, port, protocol, apiKey };
};

const upsertListingToTypesense = async (doc: Record<string, unknown>) => {
  const config = getTypesenseConfig();
  if (!config) {
    return;
  }
  const { host, port, protocol, apiKey } = config;
  const url = `${protocol}://${host}:${port}/collections/listings/documents/import?action=upsert`;
  const body = JSON.stringify(doc);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "X-TYPESENSE-API-KEY": apiKey,
    },
    body: `${body}\n`,
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Typesense listing upsert failed (${response.status}): ${text.slice(0, 200)}`);
  }
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const userJwt = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!userJwt) {
    return NextResponse.json({ error: "Please log in to create a listing." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      priceUsd?: number;
      currency?: string;
      condition?: string;
      discDocumentId?: string;
      discExternalId?: string;
      discDisplayName?: string;
      imageUrl?: string;
      imageUrls?: unknown;
      negotiable?: boolean;
      plastic?: string;
      weightGrams?: number | null;
      colorStamp?: string;
      shipping?: string;
      shippingPriceUsd?: number | null;
      city?: string;
      country?: string;
    };

    const title = (body.title ?? "").trim();
    const description = (body.description ?? "").trim();
    const discDocumentId = (body.discDocumentId ?? "").trim();
    const discExternalId = (body.discExternalId ?? "").trim();
    const discDisplayName = (body.discDisplayName ?? "").trim();
    const currency = (body.currency ?? "USD").trim() || "USD";
    const condition = (body.condition ?? "used").trim() || "used";
    const imageUrl = (body.imageUrl ?? "").trim();
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    const negotiable = body.negotiable !== false;
    const plastic = (body.plastic ?? "").trim();
    const colorStamp = (body.colorStamp ?? "").trim();
    const shipping = (body.shipping ?? "ships-us-only").trim();
    const city = (body.city ?? "").trim();
    const country = (body.country ?? "US").trim().slice(0, 2).toUpperCase();
    const weightGrams =
      body.weightGrams !== null && body.weightGrams !== undefined
        ? Number(body.weightGrams)
        : null;
    const shippingPriceUsd =
      body.shippingPriceUsd !== null && body.shippingPriceUsd !== undefined
        ? Number(body.shippingPriceUsd)
        : null;

    const priceUsd = Number(body.priceUsd);
    if (!title) {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }
    if (!discDocumentId) {
      return NextResponse.json({ error: "discDocumentId is required." }, { status: 400 });
    }
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return NextResponse.json({ error: "priceUsd must be a positive number." }, { status: 400 });
    }
    if (!allowedConditions.has(condition)) {
      return NextResponse.json({ error: "Invalid condition." }, { status: 400 });
    }
    if (!allowedShipping.has(shipping)) {
      return NextResponse.json({ error: "Invalid shipping option." }, { status: 400 });
    }
    if (
      weightGrams !== null &&
      (!Number.isFinite(weightGrams) || weightGrams < 100 || weightGrams > 250)
    ) {
      return NextResponse.json(
        { error: "weightGrams must be between 100 and 250." },
        { status: 400 },
      );
    }
    if (
      shippingPriceUsd !== null &&
      (!Number.isFinite(shippingPriceUsd) || shippingPriceUsd < 0)
    ) {
      return NextResponse.json(
        { error: "shippingPriceUsd must be 0 or greater." },
        { status: 400 },
      );
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

    const me = (await meResponse.json()) as {
      id?: number;
      documentId?: string;
      username?: string;
      confirmed?: boolean;
    };
    if (!me.id) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }
    if (!me.confirmed) {
      return NextResponse.json({ error: "Please verify your email before creating listings." }, { status: 403 });
    }

    const payload = {
      data: {
        title,
        description: description || null,
        priceUsd,
        currency,
        condition,
        status: "active",
        negotiable,
        discDocumentId,
        discExternalId: discExternalId || null,
        discDisplayName: discDisplayName || null,
        imageUrl: imageUrl || null,
        imageUrls: imageUrls.length ? imageUrls : null,
        plastic: plastic || null,
        weightGrams,
        colorStamp: colorStamp || null,
        shipping,
        shippingPriceUsd,
        city: city || null,
        country: country || null,
      },
    };

    const response = await fetch(`${strapiUrl}/api/market-listings`, {
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
        { error: `Listing create failed (${response.status}): ${detail.slice(0, 240)}` },
        { status: 502 },
      );
    }

    const created = (await response.json()) as {
      data?: {
        documentId?: string;
        id?: number;
        title?: string;
        description?: string | null;
        priceUsd?: number;
        currency?: string;
        condition?: string;
        status?: string;
        discDocumentId?: string;
        discExternalId?: string | null;
        discDisplayName?: string | null;
        imageUrl?: string | null;
        createdAt?: string;
      };
    };

    const row = created.data;
    const listingId = (row?.documentId ?? "").trim() || (row?.id != null ? String(row.id) : "");
    if (listingId) {
      const listedAt = Math.floor(Date.now() / 1000);
      await upsertListingToTypesense({
        id: listingId,
        title,
        description: description || "",
        priceUsd,
        currency,
        condition,
        status: "active",
        discId: discDocumentId,
        discExternalId: discExternalId || "",
        discDisplayName: discDisplayName || "",
        sellerId: String(me.id),
        sellerUsername: (me.username ?? "").trim(),
        imageUrl: imageUrl || "",
        listedAt,
      });
    }

    return NextResponse.json({ ok: true, listing: row ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
