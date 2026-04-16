const DMS_REGEX =
  /^\s*([NSEW])?\s*([+-]?\d+(?:\.\d+)?)\s*(?:°|º|d)?\s*(?:(\d+(?:\.\d+)?)\s*(?:'|′|m)\s*)?(?:(\d+(?:\.\d+)?)\s*(?:"|″|s)\s*)?([NSEW])?\s*$/i;

type ParsedCoordinate = {
  value: number | null;
  error: string | null;
};

const directionMultiplier = (direction: string | undefined) => {
  if (!direction) return 1;
  const normalized = direction.toUpperCase();
  if (normalized === "S" || normalized === "W") return -1;
  return 1;
};

export const parseCoordinateInRange = (
  raw: string | undefined,
  label: string,
  min: number,
  max: number
): ParsedCoordinate => {
  const trimmed = (raw ?? "").trim().replace(",", ".");
  if (!trimmed) {
    return { value: null, error: null };
  }

  const asDecimal = Number(trimmed);
  if (Number.isFinite(asDecimal)) {
    if (asDecimal < min || asDecimal > max) {
      return { value: null, error: `${label} must be between ${min} and ${max}.` };
    }
    return { value: asDecimal, error: null };
  }

  const match = trimmed.match(DMS_REGEX);
  if (!match) {
    return { value: null, error: `${label} must be a valid coordinate.` };
  }

  const [, prefixDirRaw, degreesRaw, minutesRaw, secondsRaw, suffixDirRaw] = match;
  const prefixDir = prefixDirRaw?.toUpperCase();
  const suffixDir = suffixDirRaw?.toUpperCase();
  if (prefixDir && suffixDir && prefixDir !== suffixDir) {
    return { value: null, error: `${label} has conflicting direction markers.` };
  }

  const direction = suffixDir ?? prefixDir;
  const degrees = Number(degreesRaw ?? "0");
  const minutes = Number(minutesRaw ?? "0");
  const seconds = Number(secondsRaw ?? "0");
  if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return { value: null, error: `${label} must be a valid coordinate.` };
  }
  if (minutes >= 60 || seconds >= 60) {
    return { value: null, error: `${label} has invalid minutes/seconds.` };
  }

  const sign = directionMultiplier(direction);
  const absolute = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  const signed = (degrees < 0 ? -absolute : absolute) * sign;
  if (signed < min || signed > max) {
    return { value: null, error: `${label} must be between ${min} and ${max}.` };
  }
  return { value: signed, error: null };
};
