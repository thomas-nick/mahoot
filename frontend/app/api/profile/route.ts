import { NextResponse } from "next/server";
import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();

const readJwt = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return "";
  }
  return authHeader.slice("Bearer ".length).trim();
};

const getMe = async (jwt: string) => {
  const response = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as {
    id?: number;
    username?: string;
    email?: string;
    confirmed?: boolean;
  };
};

const findExistingProfile = async (jwt: string, userId: number) => {
  const response = await fetch(
    `${STRAPI_URL}/api/profiles?filters[user][id][$eq]=${userId}&pagination[pageSize]=1`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    }
  );
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as {
    data?: Array<{ id?: number; documentId?: string; [key: string]: unknown }>;
  };
  return json.data?.[0] ?? null;
};

export async function GET(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const me = await getMe(jwt);
  if (!me?.id) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const profile = await findExistingProfile(jwt, me.id);
  return NextResponse.json({
    user: me,
    profile,
  });
}

export async function PUT(request: Request) {
  const jwt = readJwt(request);
  if (!jwt) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const me = await getMe(jwt);
  if (!me?.id) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const body = (await request.json()) as {
    displayName?: string;
    bio?: string;
    city?: string;
    state?: string;
    country?: string;
  };

  const data = {
    displayName: (body.displayName ?? "").trim() || null,
    bio: (body.bio ?? "").trim() || null,
    city: (body.city ?? "").trim() || null,
    state: (body.state ?? "").trim() || null,
    country: (body.country ?? "").trim() || null,
    user: {
      connect: [me.id],
    },
  };

  const existing = await findExistingProfile(jwt, me.id);
  const profileId = existing?.documentId ?? existing?.id;

  const response = await fetch(
    profileId ? `${STRAPI_URL}/api/profiles/${encodeURIComponent(String(profileId))}` : `${STRAPI_URL}/api/profiles`,
    {
      method: profileId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: `Profile save failed (${response.status}): ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const saved = await response.json();
  return NextResponse.json({ ok: true, profile: saved?.data ?? null });
}
