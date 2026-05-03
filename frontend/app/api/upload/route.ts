import { NextResponse } from "next/server";
import { getStrapiBrowserUrl, getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();
const PUBLIC_STRAPI_URL = getStrapiBrowserUrl();

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_PREFIX = "image/";

const readJwt = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
};

const requireUser = async (jwt: string) => {
  if (!jwt) return null;
  const response = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as { id?: number; confirmed?: boolean };
};

/**
 * Forward an authenticated browser upload to Strapi's media library.
 * Returns the absolute URL of the uploaded file so callers can store it in
 * existing string `imageUrl` fields.
 */
export async function POST(request: Request) {
  const jwt = readJwt(request);
  const me = await requireUser(jwt);
  if (!me?.id) {
    return NextResponse.json({ error: "Please log in to upload images." }, { status: 401 });
  }
  if (!me.confirmed) {
    return NextResponse.json(
      { error: "Please verify your email before uploading images." },
      { status: 403 },
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart upload." }, { status: 400 });
  }

  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field." }, { status: 400 });
  }
  if (!file.type || !file.type.toLowerCase().startsWith(ACCEPTED_PREFIX)) {
    return NextResponse.json({ error: "Only image uploads are accepted." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image is too large. Max ${(MAX_BYTES / (1024 * 1024)).toFixed(0)} MB.` },
      { status: 413 },
    );
  }

  // Strapi expects the form field to be named `files` (plural).
  const outgoing = new FormData();
  outgoing.append("files", file, file.name);

  const response = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: outgoing,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error: `Upload failed (${response.status}). ${detail.slice(0, 200) || "Check that the Authenticated role has 'upload' permission in Strapi."}`,
      },
      { status: 502 },
    );
  }

  const body = (await response.json()) as Array<{ url?: string; mime?: string; name?: string; size?: number }>;
  const first = Array.isArray(body) ? body[0] : null;
  if (!first?.url) {
    return NextResponse.json(
      { error: "Strapi did not return an upload URL." },
      { status: 502 },
    );
  }

  // Strapi often returns relative URLs (e.g. /uploads/abc.png). Convert to an
  // absolute URL the browser can render.
  const url = first.url.startsWith("http") ? first.url : `${PUBLIC_STRAPI_URL}${first.url}`;
  return NextResponse.json({
    url,
    mime: first.mime ?? file.type,
    name: first.name ?? file.name,
    size: first.size ?? file.size,
  });
}
