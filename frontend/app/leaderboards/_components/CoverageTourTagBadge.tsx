import type { CoverageTourTagId } from "../_lib/coverageTypes";
import { COVERAGE_TOUR_TAG_LABELS } from "../_lib/coverageTags";

type Props = {
  tag: CoverageTourTagId | null | undefined;
  className?: string;
};

export function CoverageTourTagBadge({ tag, className = "" }: Props) {
  if (!tag) return null;
  const label = COVERAGE_TOUR_TAG_LABELS[tag] ?? tag;
  return (
    <span className={`tour-level-badge tour-level-${tag} ${className}`.trim()} title={label}>
      {label}
    </span>
  );
}
