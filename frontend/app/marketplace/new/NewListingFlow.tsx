"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Field, Input, Notice } from "@/app/components/ui";
import { MarketplaceListingForm } from "@/app/discs/[documentId]/MarketplaceListingForm";

type DiscHit = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  plastic: string | null;
};

type SelectedDisc = {
  documentId: string;
  externalId: string;
  displayName: string;
  brand: string | null;
  category: string | null;
};

const composeDisplayName = (hit: DiscHit): string => {
  const parts = [hit.brand?.trim(), hit.plastic?.trim(), hit.name?.trim()].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
};

export function NewListingFlow() {
  const [query, setQuery] = useState<string>("");
  const [hits, setHits] = useState<DiscHit[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error" | "unconfigured">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selected, setSelected] = useState<SelectedDisc | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setSearchState("idle");
      setErrorMessage("");
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearchState("loading");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          configured?: boolean;
          discs?: DiscHit[];
          error?: string;
        };
        if (response.status === 503 || payload.configured === false) {
          setSearchState("unconfigured");
          setErrorMessage(payload.error ?? "Search isn't configured on the server.");
          setHits([]);
          return;
        }
        if (!response.ok) {
          setSearchState("error");
          setErrorMessage(payload.error ?? `Search error (${response.status}).`);
          setHits([]);
          return;
        }
        setSearchState("idle");
        setErrorMessage("");
        setHits(Array.isArray(payload.discs) ? payload.discs.slice(0, 12) : []);
      } catch (error) {
        setSearchState("error");
        setErrorMessage(error instanceof Error ? error.message : "Search failed.");
        setHits([]);
      }
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const subtitleFor = (hit: DiscHit) =>
    [hit.brand, hit.category, hit.plastic].filter(Boolean).join(" · ") || "Disc";

  const showResults = useMemo(
    () => !selected && query.trim().length >= 2,
    [selected, query],
  );

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Listing for
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {selected.displayName}
            </p>
            {selected.brand || selected.category ? (
              <p className="text-xs text-slate-600">
                {[selected.brand, selected.category].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setQuery("");
              setHits([]);
            }}
            className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Change disc
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">
            Step 2 — Listing details
          </p>
          <MarketplaceListingForm
            discDocumentId={selected.documentId}
            discExternalId={selected.externalId}
            discDisplayName={selected.displayName}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field
        label="Search the disc catalog"
        hint="Type at least 2 letters. Results come from the same search index used across the site."
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Destroyer, Buzzz, FD, Hex…"
          autoFocus
        />
      </Field>

      {searchState === "unconfigured" ? (
        <Notice variant="warn">
          Disc search isn&apos;t configured. Ask an admin to set up Typesense, or add the disc to
          the catalog first via Submit a disc.
        </Notice>
      ) : null}

      {searchState === "error" ? (
        <Notice variant="error">{errorMessage || "Could not search discs."}</Notice>
      ) : null}

      {showResults ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          {searchState === "loading" ? (
            <p className="px-3 py-2 text-xs text-slate-500">Searching…</p>
          ) : null}
          {searchState !== "loading" && hits.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">
              No discs match. Try a brand + mold (e.g. <em>Innova Destroyer</em>).
            </p>
          ) : null}
          {hits.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected({
                        documentId: hit.id,
                        externalId: "",
                        displayName: composeDisplayName(hit) || hit.name,
                        brand: hit.brand,
                        category: hit.category,
                      })
                    }
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{hit.name}</p>
                      <p className="truncate text-xs text-slate-500">{subtitleFor(hit)}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">
                      Use this disc
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
