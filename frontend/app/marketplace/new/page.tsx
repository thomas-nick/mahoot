import Link from "next/link";
import { Card, CardHeader, PageHeader } from "@/app/components/ui";
import { NewListingFlow } from "@/app/marketplace/new/NewListingFlow";

export const dynamic = "force-dynamic";

export default function NewMarketplaceListingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="List a disc"
        description="Pick the disc this listing is for, then fill out the details. Tied to the catalog so buyers can compare flight numbers and find your post in the right brand group."
      />

      <Card>
        <CardHeader
          title="Step 1 — Pick the disc"
          description="Search the catalog. Choosing a disc links your listing to its page, brand group, and reviews."
        />
        <NewListingFlow />
      </Card>

      <p className="text-xs text-slate-500">
        Don&apos;t see your disc?{" "}
        <Link href="/submit-disc" className="font-medium text-slate-700 underline">
          Submit a new disc
        </Link>{" "}
        first, then come back to list it.
      </p>
    </div>
  );
}
