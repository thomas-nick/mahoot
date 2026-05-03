import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";
import {
  allowedModerationDecisions,
  allowedSubmissionKinds,
  getModeratorIdentity,
  submissionEndpointFor,
  type ModerationDecision,
  type SubmissionKind,
} from "@/lib/moderation";

const STRAPI_URL = getStrapiServerUrl();

const readJwt = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
};

export async function POST(request: Request) {
  const jwt = readJwt(request);
  const me = await getModeratorIdentity(jwt);
  if (!me) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }
  if (!me.isModerator) {
    return NextResponse.json(
      { error: `Your role "${me.roleName ?? "Authenticated"}" cannot moderate submissions.` },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    kind?: string;
    documentId?: string;
    decision?: string;
  };
  const kind = (body.kind ?? "").trim() as SubmissionKind;
  const documentId = (body.documentId ?? "").trim();
  const decision = (body.decision ?? "").trim() as ModerationDecision;

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }
  if (!allowedSubmissionKinds.includes(kind)) {
    return NextResponse.json({ error: "Unknown submission kind." }, { status: 400 });
  }
  if (!allowedModerationDecisions.includes(decision)) {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  }

  const endpoint = submissionEndpointFor(kind);
  const response = await fetch(`${STRAPI_URL}/api/${endpoint}/${encodeURIComponent(documentId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ data: { moderation: decision } }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error: `Could not update submission (${response.status}). ${detail.slice(0, 200) || "Confirm the moderator role has 'update' permission for the submission type in Strapi."}`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
