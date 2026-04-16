"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { readAuthToken } from "@/lib/auth";

type EditDiscLinkProps = {
  documentId: string;
};

export function EditDiscLink({ documentId }: EditDiscLinkProps) {
  const hasToken = useSyncExternalStore(
    () => () => {},
    () => Boolean(readAuthToken()),
    () => false
  );

  if (!hasToken) {
    return null;
  }

  return (
    <Link
      href={`/discs/${documentId}/edit`}
      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 hover:text-slate-900"
    >
      Edit disc
    </Link>
  );
}
