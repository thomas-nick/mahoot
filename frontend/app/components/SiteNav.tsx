import { Suspense } from "react";
import { getDiscFacetOptions } from "@/lib/strapi";
import { SiteNavClient } from "./SiteNavClient";

const MANUFACTURER_LIMIT = 14;
const TYPE_LIMIT = 12;

async function SiteNavContent() {
  const facets = await getDiscFacetOptions();
  const discFacets = {
    manufacturers: facets.brands.slice(0, MANUFACTURER_LIMIT),
    types: facets.categories.slice(0, TYPE_LIMIT),
  };
  return <SiteNavClient discFacets={discFacets} />;
}

function SiteNavFallback() {
  return (
    <nav className="flex flex-wrap items-center gap-1" aria-busy="true">
      <span className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm text-slate-400">Discs</span>
      <span className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm text-slate-400">Courses</span>
      <span className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm text-slate-400">Marketplace</span>
      <span className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm text-slate-400">Contribute</span>
    </nav>
  );
}

export function SiteNav() {
  return (
    <Suspense fallback={<SiteNavFallback />}>
      <SiteNavContent />
    </Suspense>
  );
}
