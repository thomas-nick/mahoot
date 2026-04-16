import Link from "next/link";

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="text-sm text-slate-600">{description}</p>
    </header>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
      {label}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (nextPage: number) => string;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
      <span className="text-sm text-slate-600">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            page === 1
              ? "pointer-events-none bg-slate-100 text-slate-400"
              : "bg-slate-900 text-white"
          }`}
        >
          Previous
        </Link>
        <Link
          href={buildHref(Math.min(pageCount, page + 1))}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            page === pageCount
              ? "pointer-events-none bg-slate-100 text-slate-400"
              : "bg-slate-900 text-white"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
