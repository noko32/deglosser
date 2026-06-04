import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Melomano — Song Info Aggregator",
  description:
    "Search any song. Get lyrics, BPM, key, credits, samples, and album art on one page.",
  openGraph: {
    title: "Melomano — Song Info Aggregator",
    description:
      "Search any song. Get lyrics, BPM, key, credits, samples, and album art on one page.",
    siteName: "Melomano",
    type: "website",
  },
};

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <BackgroundGlow />
        <NavBar />
        {children}
        <footer className="mt-auto py-6 px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <p className="text-xs text-dg-text-secondary">
            Built by{" "}
            <a
              href="https://pabloarmenta.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dg-accent-blue hover:underline"
            >
              Pablo Armenta
            </a>
            {" · "}
            <a
              href="https://github.com/noko32"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dg-accent-blue hover:underline"
            >
              GitHub
            </a>
          </p>
          <p className="text-[11px] text-dg-text-muted max-w-2xl mx-auto leading-relaxed">
            This application uses Discogs&apos; API but is not affiliated with,
            sponsored or endorsed by Discogs. &quot;Discogs&quot; is a trademark
            of Zink Media, LLC. Song metadata provided by MusicBrainz, lyrics
            by LRCLIB, audio features by FreqBlog, album art by Cover Art
            Archive.
          </p>
        </footer>
      </body>
    </html>
  );

  if (clerkEnabled) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
