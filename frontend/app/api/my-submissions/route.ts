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
  };
};

type RawSubmission = {
  id?: number;
  documentId?: string;
  createdAt?: string;
  updatedAt?: string;
  moderation?: string | null;
  courseName?: string | null;
  discName?: string | null;
  submittedBy?: {
    id?: number;
  } | null;
};

type SubmissionRow = {
  kind: "course" | "disc";
  id: string;
  name: string;
  moderation: string;
  updatedAt: string | null;
  createdAt: string | null;
};

const mapRow = (item: RawSubmission, kind: "course" | "disc"): SubmissionRow | null => {
  const id = item.documentId || (item.id ? String(item.id) : "");
  if (!id) return null;

  return {
    kind,
    id,
    name: item.courseName || item.discName || "(Untitled submission)",
    moderation: item.moderation || "pending",
    updatedAt: item.updatedAt || null,
    createdAt: item.createdAt || null,
  };
};

const fetchSubmissionType = async (jwt: string, userId: number, kind: "course" | "disc") => {
  const endpoint = kind === "course" ? "course-submissions" : "disc-submissions";
  const nameField = kind === "course" ? "courseName" : "discName";
  const query = new URLSearchParams({
    "sort[0]": "updatedAt:desc",
    "pagination[pageSize]": "200",
    "fields[0]": nameField,
    "fields[1]": "moderation",
    "fields[2]": "createdAt",
    "fields[3]": "updatedAt",
    "populate[submittedBy][fields][0]": "id",
  });

  const response = await fetch(`${STRAPI_URL}/api/${endpoint}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return [] as SubmissionRow[];
  }

  const json = (await response.json()) as { data?: RawSubmission[] };
  return (json.data ?? [])
    .filter((item) => item.submittedBy?.id === userId)
    .map((item) => mapRow(item, kind))
    .filter((item): item is SubmissionRow => Boolean(item));
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

  const [courseSubmissions, discSubmissions] = await Promise.all([
    fetchSubmissionType(jwt, me.id, "course"),
    fetchSubmissionType(jwt, me.id, "disc"),
  ]);

  const submissions = [...courseSubmissions, ...discSubmissions].sort((a, b) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || "")
  );

  return NextResponse.json({ submissions });
}
