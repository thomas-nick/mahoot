import { NextResponse } from "next/server";

const isHttpUrl = (value: string) => value.startsWith("http://") || value.startsWith("https://");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("url") ?? "").trim();

  if (!raw) {
    return NextResponse.json({ ok: false, error: "Missing url parameter." }, { status: 400 });
  }

  if (!isHttpUrl(raw)) {
    return NextResponse.json(
      { ok: false, error: "URL must start with http:// or https://." },
      { status: 400 }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid URL format." }, { status: 400 });
  }

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `Image URL responded with status ${response.status}.` },
        { status: 200 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: `Expected image content-type, got "${contentType || "unknown"}".` },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, contentType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not fetch image URL.";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
