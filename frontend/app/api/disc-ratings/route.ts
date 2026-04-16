import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const toTenBarScore = (value: unknown, required = false) => {
  if (value === null || value === undefined || value === "") {
    return required ? NaN : null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    return NaN;
  }
  return parsed;
};

const toDeltaScore = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < -4 || parsed > 4) {
    return NaN;
  }
  return parsed;
};

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];

export async function POST(request: Request) {
  const strapiUrl = getStrapiServerUrl();
  const authHeader = request.headers.get("authorization");
  const userJwt = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!userJwt) {
    return NextResponse.json({ error: "Please log in to submit disc reviews." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      discDocumentId?: string;
      discExternalId?: string;
      discName?: string;
      overall?: number;
      feelGrip?: number;
      forgiving?: number;
      windTrust?: number;
      shotShaping?: number;
      distancePotential?: number;
      consistency?: number;
      turnDelta?: number;
      stabilityDelta?: number;
      armSpeedBand?: string;
      throwStyle?: string;
      seasonedState?: string;
      bestUseCases?: string[];
      conditions?: string[];
      wouldRecommend?: boolean;
      comment?: string;
    };

    const discDocumentId = (body.discDocumentId ?? "").trim();
    if (!discDocumentId) {
      return NextResponse.json({ error: "discDocumentId is required." }, { status: 400 });
    }

    const overall = toTenBarScore(body.overall, true);
    const tenBarScores = {
      feelGrip: toTenBarScore(body.feelGrip),
      forgiving: toTenBarScore(body.forgiving),
      windTrust: toTenBarScore(body.windTrust),
      shotShaping: toTenBarScore(body.shotShaping),
      distancePotential: toTenBarScore(body.distancePotential),
      consistency: toTenBarScore(body.consistency),
    };
    const deltas = {
      turnDelta: toDeltaScore(body.turnDelta),
      stabilityDelta: toDeltaScore(body.stabilityDelta),
    };

    if (Number.isNaN(overall)) {
      return NextResponse.json({ error: "overall must be an integer from 1 to 10." }, { status: 400 });
    }
    if (
      [...Object.values(tenBarScores), ...Object.values(deltas)].some((value) => Number.isNaN(value))
    ) {
      return NextResponse.json(
        { error: "Review scores are invalid. Ten-bar fields must be 1-10; deltas must be -4 to 4." },
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

    const me = (await meResponse.json()) as { id?: number; confirmed?: boolean };
    const userId = me.id;
    if (!userId) {
      return NextResponse.json({ error: "Could not resolve authenticated user." }, { status: 401 });
    }
    if (!me.confirmed) {
      return NextResponse.json(
        { error: "Please verify your email before submitting reviews." },
        { status: 403 },
      );
    }

    const baseData = {
      discDocumentId,
      discExternalId: (body.discExternalId ?? "").trim() || null,
      discName: (body.discName ?? "").trim() || null,
      overall,
      ...tenBarScores,
      ...deltas,
      armSpeedBand: (body.armSpeedBand ?? "").trim() || null,
      throwStyle: (body.throwStyle ?? "").trim() || null,
      seasonedState: (body.seasonedState ?? "").trim() || null,
      bestUseCases: normalizeStringArray(body.bestUseCases),
      conditions: normalizeStringArray(body.conditions),
      wouldRecommend: typeof body.wouldRecommend === "boolean" ? body.wouldRecommend : null,
      comment: (body.comment ?? "").trim() || null,
    };

    let supportsSubmittedBy = true;
    let existingResponse = await fetch(
      `${strapiUrl}/api/disc-ratings?filters[discDocumentId][$eq]=${encodeURIComponent(discDocumentId)}&filters[submittedBy][id][$eq]=${userId}&pagination[pageSize]=1`,
      {
        headers: {
          Authorization: `Bearer ${userJwt}`,
        },
        cache: "no-store",
      },
    );

    if (!existingResponse.ok) {
      const detail = await existingResponse.text();
      const missingSubmittedBy =
        existingResponse.status === 400 && detail.toLowerCase().includes("invalid key submittedby");

      if (missingSubmittedBy) {
        supportsSubmittedBy = false;
        existingResponse = await fetch(
          `${strapiUrl}/api/disc-ratings?filters[discDocumentId][$eq]=${encodeURIComponent(discDocumentId)}&pagination[pageSize]=1`,
          {
            headers: {
              Authorization: `Bearer ${userJwt}`,
            },
            cache: "no-store",
          },
        );
      } else {
        return NextResponse.json(
          { error: `Could not verify existing review (${existingResponse.status}): ${detail.slice(0, 120)}` },
          { status: 502 },
        );
      }
    }

    if (!existingResponse.ok) {
      const detail = await existingResponse.text();
      return NextResponse.json(
        { error: `Could not verify existing review (${existingResponse.status}): ${detail.slice(0, 120)}` },
        { status: 502 },
      );
    }

    const existingJson = (await existingResponse.json()) as {
      data?: Array<{ id?: number; documentId?: string }>;
    };
    const existing = existingJson.data?.[0];
    const updateTarget = existing?.documentId ?? String(existing?.id ?? "");

    const finalPayload = supportsSubmittedBy
      ? {
          data: {
            ...baseData,
            submittedBy: { connect: [userId] },
          },
        }
      : { data: baseData };

    const response = await fetch(
      updateTarget
        ? `${strapiUrl}/api/disc-ratings/${encodeURIComponent(updateTarget)}`
        : `${strapiUrl}/api/disc-ratings`,
      {
        method: updateTarget ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userJwt}`,
        },
        body: JSON.stringify(finalPayload),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `Review submit failed (${response.status}): ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const created = await response.json();
    return NextResponse.json({
      ok: true,
      review: created?.data ?? null,
      warning: supportsSubmittedBy
        ? null
        : "submittedBy relation not active in Strapi yet. Restart Strapi after schema changes to re-enable one review per user.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
