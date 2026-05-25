import type { CSSProperties } from "react";
import { getHankoChar } from "../_lib/hanko";

interface HankoSealProps {
  manufacturer: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  pressed?: boolean;
  variant?: "dark" | "light";
}

const sizes = { sm: "hanko-sm", md: "hanko-md", lg: "hanko-lg" };

export function HankoSeal({
  manufacturer,
  color = "var(--vermillion)",
  size = "md",
  pressed = false,
  variant = "dark",
}: HankoSealProps) {
  return (
    <div
      className={`hanko ${sizes[size]} ${pressed ? "hanko-pressed" : ""} hanko-${variant}`}
      style={{ "--hanko-ink": color } as CSSProperties}
      aria-hidden
    >
      <span className="hanko-char">{getHankoChar(manufacturer)}</span>
    </div>
  );
}
