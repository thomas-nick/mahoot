import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { CatalogSearch } from "@/app/components/CatalogSearch";
import { AccountBadge } from "@/app/components/AccountBadge";
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
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
          <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-start">
                <Link href="/" className="inline-flex items-center" aria-label="Disc Golf Catalog home">
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
                <nav className="flex gap-4 text-sm text-slate-600 sm:ml-2">
                  <Link href="/discs" className="hover:text-slate-900">
                    Discs
                  </Link>
                  <Link href="/courses" className="hover:text-slate-900">
                    Courses
                  </Link>
                  <Link href="/submit-course" className="hover:text-slate-900">
                    Add Course
                  </Link>
                  <Link href="/submit-disc" className="hover:text-slate-900">
                    Add Disc
                  </Link>
                  <Link href="/collector" className="hover:text-slate-900">
                    Collector
                  </Link>
                  <Link href="/account" className="hover:text-slate-900">
                    Account
                  </Link>
                </nav>
                <AccountBadge />
              </div>
              <CatalogSearch />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
