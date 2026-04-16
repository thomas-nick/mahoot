"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { withCourseQuery } from "@/lib/course-query";

type CityEntry = { city: string; count: number };

type Props = {
  currentParams: Record<string, string | undefined>;
};

export function NearbyCitiesPanel({ currentParams }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "denied" | "unavailable" | "error">(
    "idle"
  );
  const [cities, setCities] = useState<CityEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadNearby = useCallback((coords: GeolocationCoordinates) => {
    setStatus("loading");
    setMessage(null);
    const params = new URLSearchParams({
      lat: String(coords.latitude),
      lng: String(coords.longitude),
    });
    fetch(`/api/nearby-cities?${params.toString()}`)
      .then(async (res) => {
        const json = (await res.json()) as { cities?: CityEntry[]; error?: string };
        if (res.status === 503) {
          setStatus("unavailable");
          setMessage(json.error ?? "Search is not configured.");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          setMessage(json.error ?? "Could not load nearby cities.");
          return;
        }
        setCities(json.cities ?? []);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not load nearby cities.");
      });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!navigator.geolocation) {
        setStatus("unavailable");
        setMessage("Location is not supported in this browser.");
        return;
      }

      setStatus("loading");
      navigator.geolocation.getCurrentPosition(
        (pos) => loadNearby(pos.coords),
        () => {
          setStatus("denied");
          setMessage(null);
        },
        { enableHighAccuracy: false, maximumAge: 300_000, timeout: 12_000 }
      );
    });
    return () => cancelAnimationFrame(id);
  }, [loadNearby]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => loadNearby(pos.coords),
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 }
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Cities within 50 mi</h3>
      <p className="mt-1 text-xs text-slate-500">
        Ranked by number of courses near your location (requires location access).
      </p>

      {status === "loading" && (
        <p className="mt-3 text-xs text-slate-500">Getting location and loading cities…</p>
      )}

      {status === "denied" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-600">Location access is off or denied.</p>
          <button
            type="button"
            onClick={requestLocation}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Use my location
          </button>
        </div>
      )}

      {(status === "unavailable" || status === "error") && message && (
        <p className="mt-3 text-xs text-amber-800">{message}</p>
      )}

      {status === "ready" && cities.length === 0 && (
        <p className="mt-3 text-xs text-slate-600">No courses with locations found within 50 miles.</p>
      )}

      {status === "ready" && cities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {cities.map(({ city, count }) => {
            const isActive = currentParams.city === city;
            return (
              <Link
                key={`nearby-city-${city}`}
                href={withCourseQuery(currentParams, {
                  city: isActive ? undefined : city,
                  page: undefined,
                })}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {city}
                <span
                  className={`ml-1 tabular-nums ${isActive ? "text-slate-300" : "text-slate-500"}`}
                >
                  ({count})
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
