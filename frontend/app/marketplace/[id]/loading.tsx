const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
);

export default function ListingDetailLoading() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-4 w-48" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <SkeletonBlock className="aspect-square w-full" />
        <div className="space-y-4">
          <SkeletonBlock className="h-7 w-3/4" />
          <SkeletonBlock className="h-9 w-1/3" />
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-44 w-full" />
        </div>
      </div>
    </div>
  );
}
