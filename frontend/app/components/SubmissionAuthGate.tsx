"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readAuthToken } from "@/lib/auth";

/**
 * Server + first client paint must match to avoid hydration errors.
 * We only branch on auth after mount (client-only).
 */
type Phase = "boot" | "signedIn" | "signedOut";

export type SubmissionAuthGateProps = {
  returnPath: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const hasToken = () => {
  try {
    return Boolean(readAuthToken());
  } catch {
    return false;
  }
};

function SubmissionAuthGate({ returnPath, title, description, children }: SubmissionAuthGateProps) {
  const [phase, setPhase] = useState<Phase>("boot");

  useEffect(() => {
    const sync = () => {
      setPhase(hasToken() ? "signedIn" : "signedOut");
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  if (phase === "boot") {
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

  if (phase === "signedOut") {
    const loginHref = `/account?next=${encodeURIComponent(returnPath)}`;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sign in required</p>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">{description}</p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
            <Link
              href={loginHref}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Log in or create account
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 hover:bg-slate-50"
            >
              Account page
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            After you sign in, you&apos;ll be sent back here to continue your submission.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export { SubmissionAuthGate };
export default SubmissionAuthGate;
