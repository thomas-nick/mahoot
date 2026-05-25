"use client";

import { useState, type CSSProperties } from "react";
import { brandInitials, brandLogoUrl, hasLogo } from "../_lib/brandAssets";

interface BrandLogoProps {
  manufacturer: string;
  color: string;
  size?: number;
  glow?: boolean;
  variant?: "orb" | "sunk";
  className?: string;
}

export function BrandLogo({
  manufacturer,
  color,
  size = 56,
  glow = false,
  variant = "orb",
  className = "",
}: BrandLogoProps) {
  const [errored, setErrored] = useState(false);
  const showImage = hasLogo(manufacturer) && !errored;

  const style = {
    width: size,
    height: size,
    "--brand": color,
  } as CSSProperties;

  return (
    <div
      className={`brand-logo ${variant === "sunk" ? "brand-logo-sunk" : ""} ${glow ? "brand-logo-glow" : ""} ${className}`}
      style={style}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brandLogoUrl(manufacturer)}
          alt={manufacturer}
          onError={() => setErrored(true)}
          className="brand-logo-img"
        />
      ) : (
        <span
          className="brand-logo-initials"
          style={{ fontSize: Math.max(10, size * 0.32) }}
        >
          {brandInitials(manufacturer)}
        </span>
      )}
    </div>
  );
}
