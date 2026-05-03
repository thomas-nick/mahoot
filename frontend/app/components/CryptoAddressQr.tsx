"use client";

import QRCode from "react-qr-code";

type Props = {
  /** Plain text encoded in the QR (usually the wallet address). */
  value: string;
  /** Pixel size of the square (default 76). */
  size?: number;
  className?: string;
};

/** Small QR for scanning a payout address into a mobile wallet. */
export function CryptoAddressQr({ value, size = 76, className = "" }: Props) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  return (
    <div
      className={`shrink-0 rounded-lg border border-violet-200 bg-white p-1 ${className}`}
      style={{ width: size + 8, height: size + 8 }}
      title="Scan with your wallet app"
    >
      <QRCode
        value={trimmed}
        size={size}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        viewBox={`0 0 ${size} ${size}`}
      />
    </div>
  );
}
