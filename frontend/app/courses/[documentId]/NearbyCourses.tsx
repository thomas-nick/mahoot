"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NearbyCourse = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  distanceMiles?: number | null;
};

type SearchPayload = {
  nearbyCourses?: NearbyCourse[];
};

export function NearbyCourses({
  query,
  currentCourseId,
  limit = 5,
}: {
  query: string;
  currentCourseId: string;
  limit?: number;
}) {
  const [items, setItems] = useState<NearbyCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = (await res.json()) as SearchPayload;
        if (cancelled) return;
        const list = (json.nearbyCourses ?? [])
          .filter((course) => course.id !== currentCourseId)
          .sort((a, b) => {
            const aDistance = typeof a.distanceMiles === "number" ? a.distanceMiles : Number.POSITIVE_INFINITY;
            const bDistance = typeof b.distanceMiles === "number" ? b.distanceMiles : Number.POSITIVE_INFINITY;
            return aDistance - bDistance;
          })
          .slice(0, limit);
        setItems(list);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [query, currentCourseId, limit]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Courses within 25 miles</h2>
      {loading ? (
        <p className="mt-2 text-sm text-slate-500">Loading nearby courses...</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No nearby courses found within 25 miles.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((course) => (
            <li key={course.id}>
              <Link
                href={`/courses/${course.id}`}
                className="block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{course.name}</span>
                <span className="ml-2 text-slate-500">
                  {[course.city, course.state].filter(Boolean).join(", ") || "Course"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
