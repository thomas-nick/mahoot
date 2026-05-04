import Link from "next/link";
import { Card, CardHeader, LinkButton } from "@/app/components/ui";
import { MemberShell, memberSectionSurface } from "@/app/components/MemberShell";
import { NewListingFlow } from "@/app/marketplace/new/NewListingFlow";

export const dynamic = "force-dynamic";

export default function NewMarketplaceListingPage() {
  return (
    <MemberShell className="space-y-6">
      <div className={`p-6 sm:p-8 ${memberSectionSurface}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">List a disc</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              Choose the catalog disc this listing is for, then add photos and details. Buyers land on the right brand
              group and can compare flight numbers before they message you.
            </p>
          </div>
          <LinkButton href="/marketplace" variant="secondary" className="shrink-0 rounded-full shadow-sm">
            Back to marketplace
          </LinkButton>
        </div>
      </div>

      <Card className={memberSectionSurface}>
        <CardHeader
          title="Step 1 — Pick the disc"
          description="Search the catalog. Choosing a disc links your listing to its page, brand group, and reviews."
        />
        <NewListingFlow />
      </Card>

      <p className="px-1 text-xs text-slate-500">
        Don&apos;t see your disc?{" "}
        <Link href="/submit-disc" className="font-medium text-sky-800 underline decoration-sky-300 underline-offset-2 hover:text-sky-950">
          Submit a new disc
        </Link>{" "}
        first, then come back to list it.
      </p>
    </MemberShell>
  );
}
