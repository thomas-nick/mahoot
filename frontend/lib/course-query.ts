export function withCourseQuery(
  baseParams: Record<string, string | undefined>,
  updates: Record<string, string | undefined>
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...baseParams, ...updates })) {
    if (value && value.trim().length > 0) {
      query.set(key, value);
    }
  }
  const raw = query.toString();
  return raw ? `/courses?${raw}` : "/courses";
}
