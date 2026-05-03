/**
 * Soft format hints for seller-pasted crypto addresses (Phase 1 — no chain RPC).
 * Return `null` when empty or looks reasonable; otherwise a short user-facing tip.
 */

export function hintEthAddress(raw: string): string | null {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(s)) {
    return "EVM addresses are usually 0x followed by 40 hex characters.";
  }
  return null;
}

export function hintSolAddress(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.length < 32 || s.length > 44) {
    return "Solana addresses are often 32–44 base58 characters.";
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(s)) {
    return "Uses base58 (characters exclude 0, O, I, l).";
  }
  return null;
}

export function hintSs58Address(raw: string, _chain: "dot" | "ksm"): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.length < 30 || s.length > 62) {
    return "SS58 addresses are often 30–62 characters.";
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(s)) {
    return "SS58 uses base58 alphabet.";
  }
  return null;
}

export function hintBtcAddress(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (
    /^(bc1[qp][0-9a-z]{8,})$/.test(lower) ||
    /^(bc1p[0-9a-z]{8,})$/.test(lower) ||
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(s)
  ) {
    return null;
  }
  return "Bitcoin addresses often start with bc1…, 1…, or 3…. Double-check for typos.";
}
