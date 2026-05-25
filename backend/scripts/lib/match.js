'use strict';

/** Normalize a course name for matching: lowercase, strip punctuation, collapse whitespace. */
const normalizeName = (raw) =>
  String(raw ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

/** URL-safe slug used inside externalId values. */
const slugify = (raw) =>
  String(raw ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Iterative Levenshtein. O(n*m) time, O(min(n,m)) space. */
const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (a.length > b.length) [a, b] = [b, a];

  const prev = new Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) prev[i] = i;

  for (let j = 1; j <= b.length; j++) {
    let prevDiag = prev[0];
    prev[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = prev[i];
      prev[i] = Math.min(
        prev[i] + 1,
        prev[i - 1] + 1,
        prevDiag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prevDiag = tmp;
    }
  }
  return prev[a.length];
};

/** Similarity in [0, 1]; 1 = identical. */
const similarity = (a, b) => {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
};

/**
 * Rank canonical courses against a target name.
 * `courses` items: { documentId, externalId, name, normalizedName, city, state }.
 * Returns top N by descending score, plus the score (0..1).
 */
const suggestCourses = (targetNormalized, courses, n = 5) => {
  const scored = courses.map((c) => ({
    course: c,
    score: similarity(targetNormalized, c.normalizedName),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n);
};

module.exports = { normalizeName, slugify, levenshtein, similarity, suggestCourses };
