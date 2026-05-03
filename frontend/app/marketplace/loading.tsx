import { PageHeader } from "@/app/components/ui";

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
);

const SkeletonCard = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <SkeletonBlock className="aspect-square w-full rounded-none" />
    <div className="space-y-2 p-4">
      <SkeletonBlock className="h-3 w-3/4" />
      <SkeletonBlock className="h-3 w-1/2" />
      <div className="flex gap-2 pt-1">
        <SkeletonBlock className="h-4 w-12" />
        <SkeletonBlock className="h-4 w-12" />
      </div>
    </div>
  </div>
);

export default function MarketplaceLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        description="Loading the latest community listings…"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} className="h-20 w-full" />
        ))}
      </div>

      <SkeletonBlock className="h-14 w-full" />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <SkeletonBlock className="hidden h-[420px] w-full lg:block" />
        <div className="space-y-4">
          <SkeletonBlock className="h-12 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
