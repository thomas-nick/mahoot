import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { HeaderSearch } from "@/app/components/HeaderSearch";
import { AccountBadge } from "@/app/components/AccountBadge";
import { SiteNav } from "@/app/components/SiteNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Disc Golf Catalog",
  description: "Simple catalog web app for discs and courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 overflow-visible border-b border-slate-200/70 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/65">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
              <Link
                href="/"
                className="inline-flex shrink-0 items-center"
                aria-label="Disc Golf Catalog home"
              >
                <Image
                  src="/mahootlabs-placeholder.png"
                  alt="Mahoot Labs"
                  width={140}
                  height={40}
                  className="h-8 w-auto"
                  priority
                />
                <span className="sr-only">Disc Golf Catalog</span>
              </Link>
              <div className="hidden lg:block">
                <SiteNav />
              </div>
              <div className="ml-auto flex items-center gap-3">
                <HeaderSearch />
                <AccountBadge />
              </div>
            </div>
            <div className="border-t border-slate-100 bg-white/70 lg:hidden">
              <div className="mx-auto w-full max-w-6xl px-4 py-2 sm:px-6">
                <SiteNav />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
