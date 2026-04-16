"use client";

import nextDynamic from "next/dynamic";
import { AuthGateSkeleton } from "@/app/components/AuthGateSkeleton";
import type { SubmissionAuthGateProps } from "@/app/components/SubmissionAuthGate";

const SubmissionAuthGate = nextDynamic(() => import("@/app/components/SubmissionAuthGate"), {
  ssr: false,
  loading: () => <AuthGateSkeleton />,
});

export function SubmissionAuthGateDynamic(props: SubmissionAuthGateProps) {
  return <SubmissionAuthGate {...props} />;
}
