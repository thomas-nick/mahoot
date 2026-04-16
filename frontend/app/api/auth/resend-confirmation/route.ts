import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!jwt) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const meResponse = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    cache: "no-store",
  });
  if (!meResponse.ok) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const me = (await meResponse.json()) as { email?: string; confirmed?: boolean };
  if (!me.email) {
    return NextResponse.json({ error: "Could not resolve user email." }, { status: 400 });
  }
  if (me.confirmed) {
    return NextResponse.json({ ok: true, message: "Email is already verified." });
  }

  const response = await fetch(`${STRAPI_URL}/api/auth/send-email-confirmation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: me.email }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Could not send verification email (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, message: "Verification email sent." });
}
