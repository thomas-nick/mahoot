import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const strapiConnectionError = (cause: unknown, strapiUrl: string) => {
  const msg = cause instanceof Error ? cause.message : String(cause);
  const isFetchFailed =
    msg.includes("fetch failed") ||
    msg === "Failed to fetch" ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT");
  if (isFetchFailed) {
    return `Cannot reach Strapi at ${strapiUrl}. Start Strapi (e.g. npm run develop in backend) or set STRAPI_URL / NEXT_PUBLIC_STRAPI_URL to the correct URL.`;
  }
  return msg;
};

const normalizeToken = (value: string | undefined) => {
  const token = (value ?? "").trim();
  if (!token) {
    return "";
  }

  if (token.length % 2 === 0) {
    const half = token.length / 2;
    const firstHalf = token.slice(0, half);
    const secondHalf = token.slice(half);
    if (firstHalf === secondHalf) {
      return firstHalf;
    }
  }

  return token;
};

const toNumberOrNull = (raw: FormDataEntryValue | null) => {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export async function POST(request: Request) {
  const strapiUrl = getStrapiServerUrl();
  const token = normalizeToken(process.env.STRAPI_SUBMISSIONS_TOKEN ?? process.env.STRAPI_API_TOKEN);
  const authHeader = request.headers.get("authorization");
  const userJwt = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json(
      { error: "Missing STRAPI_SUBMISSIONS_TOKEN or STRAPI_API_TOKEN on server." },
      { status: 500 }
    );
  }

  try {
    if (!userJwt) {
      return NextResponse.json({ error: "Please log in before submitting a disc." }, { status: 401 });
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
    const me = (await meResponse.json()) as { id?: number; confirmed?: boolean };
    if (!me.id) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }
    if (!me.confirmed) {
      return NextResponse.json(
        { error: "Please verify your email before submitting a disc." },
        { status: 403 }
      );
    }

    const form = await request.formData();
    const discName = String(form.get("discName") ?? "").trim();
    const brand = String(form.get("brand") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const speed = toNumberOrNull(form.get("speed"));
    const glide = toNumberOrNull(form.get("glide"));
    const turn = toNumberOrNull(form.get("turn"));
    const fade = toNumberOrNull(form.get("fade"));
    const stability = String(form.get("stability") ?? "").trim();
    const plastic = String(form.get("plastic") ?? "").trim();
    const diameterCm = toNumberOrNull(form.get("diameterCm"));
    const heightCm = toNumberOrNull(form.get("heightCm"));
    const rimDepthCm = toNumberOrNull(form.get("rimDepthCm"));
    const rimThicknessCm = toNumberOrNull(form.get("rimThicknessCm"));
    const maxWeightGr = toNumberOrNull(form.get("maxWeightGr"));
    const link = String(form.get("link") ?? "").trim();
    const imageUrl = String(form.get("imageUrl") ?? "").trim();
    const color = String(form.get("color") ?? "").trim();
    const backgroundColor = String(form.get("backgroundColor") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();

    if (!discName) {
      return NextResponse.json({ error: "Disc name is required." }, { status: 400 });
    }
    if ([speed, glide, turn, fade].some((v) => Number.isNaN(v))) {
      return NextResponse.json({ error: "Flight numbers must be valid numbers." }, { status: 400 });
    }
    if ([diameterCm, heightCm, rimDepthCm, rimThicknessCm, maxWeightGr].some((v) => Number.isNaN(v))) {
      return NextResponse.json({ error: "Dimensions must be valid numbers." }, { status: 400 });
    }
    if (notes.length > 3000) {
      return NextResponse.json({ error: "Notes must be 3000 characters or fewer." }, { status: 400 });
    }

    const payload = {
      data: {
        discName,
        brand: brand || null,
        category: category || null,
        speed,
        glide,
        turn,
        fade,
        stability: stability || null,
        plastic: plastic || null,
        diameterCm,
        heightCm,
        rimDepthCm,
        rimThicknessCm,
        maxWeightGr,
        link: link || null,
        imageUrl: imageUrl || null,
        color: color || null,
        backgroundColor: backgroundColor || null,
        notes: notes || null,
        submittedBy: { connect: [me.id] },
      },
    };

    let createResponse = await fetch(`${strapiUrl}/api/disc-submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!createResponse.ok) {
      const firstDetail = await createResponse.text();
      const shouldRetrySubmittedByFormat = firstDetail.includes("Invalid key submittedBy");
      if (shouldRetrySubmittedByFormat) {
        // Try alternate relation format used by some Strapi setups.
        const fallbackPayload = {
          data: {
            ...payload.data,
            submittedBy: me.id,
          },
        };
        createResponse = await fetch(`${strapiUrl}/api/disc-submissions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(fallbackPayload),
          cache: "no-store",
        });
      } else {
        return NextResponse.json(
          { error: `Submission failed (${createResponse.status}): ${firstDetail.slice(0, 200)}` },
          { status: 502 }
        );
      }
    }

    if (!createResponse.ok) {
      const detail = await createResponse.text();
      return NextResponse.json(
        { error: `Submission failed (${createResponse.status}): ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const created = await createResponse.json();
    return NextResponse.json({ ok: true, submission: created?.data ?? null });
  } catch (error) {
    const message = strapiConnectionError(error, strapiUrl);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
