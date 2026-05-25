"use client";

export type ThemeMode = "clean" | "hanko" | "arena";

interface ThemeToggleProps {
  theme: ThemeMode;
  onChange: (theme: ThemeMode) => void;
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <div className="theme-toggle" role="tablist" aria-label="Theme">
      <button
        type="button"
        role="tab"
        aria-selected={theme === "clean"}
        onClick={() => onChange("clean")}
        className={`theme-toggle-btn ${theme === "clean" ? "theme-toggle-btn-active" : ""}`}
        title="Clean · mobile-first"
      >
        <svg viewBox="0 0 24 24" className="theme-toggle-icon" fill="none" aria-hidden>
          <rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="theme-toggle-label">Clean</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={theme === "hanko"}
        onClick={() => onChange("hanko")}
        className={`theme-toggle-btn ${theme === "hanko" ? "theme-toggle-btn-active" : ""}`}
        title="Hanko · paper & seal"
      >
        <span className="theme-toggle-icon" aria-hidden>印</span>
        <span className="theme-toggle-label">Hanko</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={theme === "arena"}
        onClick={() => onChange("arena")}
        className={`theme-toggle-btn ${theme === "arena" ? "theme-toggle-btn-active" : ""}`}
        title="Arena · gamified leaderboard"
      >
        <svg viewBox="0 0 24 24" className="theme-toggle-icon" fill="none" aria-hidden>
          <path
            d="M6 4h12v3a5 5 0 0 1-5 5h-2A5 5 0 0 1 6 7V4Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M9 12h6v3l1 5H8l1-5v-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        <span className="theme-toggle-label">Arena</span>
      </button>
    </div>
  );
}
