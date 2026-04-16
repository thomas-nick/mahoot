/** Placeholder while the submission auth gate loads (client-only). */
export function AuthGateSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8">
      <div className="mx-auto max-w-md space-y-3">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
