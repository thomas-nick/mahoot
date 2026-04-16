import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const toScore = (value: unknown, required = false) => {
  if (value === null || value === undefined || value === "") {
    return required ? NaN : null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    return NaN;
  }
  return parsed;
};

export async function POST(request: Request) {
  const strapiUrl = getStrapiServerUrl();
  const authHeader = request.headers.get("authorization");
  const userJwt = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!userJwt) {
    return NextResponse.json({ error: "Please log in to submit ratings." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      courseDocumentId?: string;
      overall?: number;
      layout?: number;
      signage?: number;
      maintenance?: number;
      scenery?: number;
      comment?: string;
    };

    const courseDocumentId = (body.courseDocumentId ?? "").trim();
    if (!courseDocumentId) {
      return NextResponse.json({ error: "courseDocumentId is required." }, { status: 400 });
    }

    const overall = toScore(body.overall, true);
    const layout = toScore(body.layout);
    const signage = toScore(body.signage);
    const maintenance = toScore(body.maintenance);
    const scenery = toScore(body.scenery);

    if (Number.isNaN(overall)) {
      return NextResponse.json({ error: "overall must be an integer from 1 to 10." }, { status: 400 });
    }
    if ([layout, signage, maintenance, scenery].some((value) => Number.isNaN(value))) {
      return NextResponse.json(
        { error: "criteria ratings must be integers from 1 to 10 when provided." },
        { status: 400 }
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
        { error: "Please verify your email before submitting ratings." },
        { status: 403 }
      );
    }

    let supportsSubmittedBy = true;

    const baseData = {
      overall,
      layout,
      signage,
      maintenance,
      scenery,
      comment: (body.comment ?? "").trim() || null,
      course: {
        connect: [{ documentId: courseDocumentId }],
      },
    };

    const payload = {
      data: {
        ...baseData,
        submittedBy: { connect: [userId] },
      },
    };

    let existingResponse = await fetch(
      `${strapiUrl}/api/course-ratings?filters[course][documentId][$eq]=${encodeURIComponent(courseDocumentId)}&filters[submittedBy][id][$eq]=${userId}&pagination[pageSize]=1`,
      {
        headers: {
          Authorization: `Bearer ${userJwt}`,
        },
        cache: "no-store",
      }
    );

    if (!existingResponse.ok) {
      const detail = await existingResponse.text();
      const missingSubmittedBy =
        existingResponse.status === 400 && detail.toLowerCase().includes("invalid key submittedby");

      if (missingSubmittedBy) {
        supportsSubmittedBy = false;
        existingResponse = await fetch(
          `${strapiUrl}/api/course-ratings?filters[course][documentId][$eq]=${encodeURIComponent(courseDocumentId)}&pagination[pageSize]=1`,
          {
            headers: {
              Authorization: `Bearer ${userJwt}`,
            },
            cache: "no-store",
          }
        );
      } else {
        return NextResponse.json(
          { error: `Could not verify existing rating (${existingResponse.status}): ${detail.slice(0, 120)}` },
          { status: 502 }
        );
      }
    }

    if (!existingResponse.ok) {
      const detail = await existingResponse.text();
      return NextResponse.json(
        { error: `Could not verify existing rating (${existingResponse.status}): ${detail.slice(0, 120)}` },
        { status: 502 }
      );
    }

    const existingJson = (await existingResponse.json()) as {
      data?: Array<{ id?: number; documentId?: string }>;
    };
    const existing = existingJson.data?.[0];
    const updateTarget = existing?.documentId ?? String(existing?.id ?? "");

    const finalPayload = supportsSubmittedBy
      ? payload
      : {
          data: baseData,
        };

    const response = await fetch(
      updateTarget
        ? `${strapiUrl}/api/course-ratings/${encodeURIComponent(updateTarget)}`
        : `${strapiUrl}/api/course-ratings`,
      {
      method: updateTarget ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userJwt}`,
      },
      body: JSON.stringify(finalPayload),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `Rating submit failed (${response.status}): ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const created = await response.json();
    return NextResponse.json({
      ok: true,
      rating: created?.data ?? null,
      warning: supportsSubmittedBy
        ? null
        : "submittedBy relation not active in Strapi yet. Restart Strapi after schema changes to re-enable one rating per user.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
