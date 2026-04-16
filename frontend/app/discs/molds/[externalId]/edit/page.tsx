import Link from "next/link";
import { notFound } from "next/navigation";
import { getDiscMoldByExternalId } from "@/lib/strapi";
import { EditDiscMoldForm } from "./EditDiscMoldForm";

export const dynamic = "force-dynamic";

type EditDiscMoldPageProps = {
  params: Promise<{ externalId: string }>;
  searchParams: Promise<{ fromDisc?: string }>;
};

export default async function EditDiscMoldPage({ params, searchParams }: EditDiscMoldPageProps) {
  const { externalId } = await params;
  const { fromDisc } = await searchParams;
  const sourceDiscDocumentId = (fromDisc ?? "").trim();
  const mold = await getDiscMoldByExternalId(externalId);

  if (!mold) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/discs"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 hover:text-slate-900"
          >
            ← Back to discs
          </Link>
          {sourceDiscDocumentId ? (
            <>
              <Link
                href={`/discs/${encodeURIComponent(sourceDiscDocumentId)}`}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 hover:text-slate-900"
              >
                Back to disc
              </Link>
              <Link
                href={`/discs/${encodeURIComponent(sourceDiscDocumentId)}/edit`}
                className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
              >
                Back to disc edit
              </Link>
            </>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Edit Disc Mold</h1>
        <p className="text-sm text-slate-600">{mold.name}</p>
      </header>
      <EditDiscMoldForm mold={mold} />
    </div>
  );
}
