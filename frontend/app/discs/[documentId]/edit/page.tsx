import Link from "next/link";
import { notFound } from "next/navigation";
import { getDiscByDocumentId } from "@/lib/strapi";
import { EditDiscForm } from "./EditDiscForm";

export const dynamic = "force-dynamic";

type EditDiscPageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function EditDiscPage({ params }: EditDiscPageProps) {
  const { documentId } = await params;
  const disc = await getDiscByDocumentId(documentId);

  if (!disc) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link href={`/discs/${documentId}`} className="inline-block text-sm text-slate-600 hover:text-slate-900">
          ← Back to disc
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Edit Disc</h1>
        <p className="text-sm text-slate-600">{disc.name}</p>
      </header>
      <EditDiscForm disc={disc} />
    </div>
  );
}
