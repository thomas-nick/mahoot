import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./leaderboards.css";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-sans-jp",
  weight: ["400", "500", "600"],
  display: "swap",
});

const notoSerif = Noto_Serif_JP({
  subsets: ["latin"],
  variable: "--font-serif-jp",
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "Live disc golf standings: DGPT Manufacturers Cup (constructors-style brand championship), weighted Player Tour stats, and the Asia & SE Asia pro leaderboard.",
};

export default function LeaderboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`leaderboards-root ${notoSans.variable} ${notoSerif.variable}`}>
      {children}
    </div>
  );
}
