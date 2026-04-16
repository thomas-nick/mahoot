import { SubmissionAuthGateDynamic } from "@/app/components/SubmissionAuthGateDynamic";
import { PageHeader } from "@/app/components/ui";
import { SubmitCourseForm } from "./SubmitCourseForm";

export const dynamic = "force-dynamic";

export default function SubmitCoursePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Submit a Course"
        description="A simple 3-step flow with draft autosave. Add essentials first, then details/media, then review before sending for moderation."
      />
      <SubmissionAuthGateDynamic
        returnPath="/submit-course"
        title="Log in to submit a course"
        description="Contributions require a verified account. Sign in or register, then you’ll return here to finish."
      >
        <SubmitCourseForm />
      </SubmissionAuthGateDynamic>
    </div>
  );
}
