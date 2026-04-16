import { SubmissionAuthGateDynamic } from "@/app/components/SubmissionAuthGateDynamic";
import { PageHeader } from "@/app/components/ui";
import { SubmitDiscForm } from "./SubmitDiscForm";

export const dynamic = "force-dynamic";

export default function SubmitDiscPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Submit a Disc"
        description="A simple 3-step flow with draft autosave. Submit disc specs and links for moderation before publishing."
      />
      <SubmissionAuthGateDynamic
        returnPath="/submit-disc"
        title="Log in to submit a disc"
        description="Contributions require a verified account. Sign in or register, then you’ll return here to finish."
      >
        <SubmitDiscForm />
      </SubmissionAuthGateDynamic>
    </div>
  );
}
