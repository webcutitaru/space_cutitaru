import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://space.cutitaru.com"),
  title: {
    default: "SPACE by cutitaru",
    template: "%s | SPACE by cutitaru",
  },
  description:
    "SPACE is a platform of SaaS tools and mini projects by cutitaru — starting with Shopify Reviews Extractor.",
  keywords: ["SPACE", "cutitaru", "SaaS", "Shopify", "reviews extractor"],
  authors: [{ name: "cutitaru", url: "https://cutitaru.com" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://space.cutitaru.com",
    siteName: "SPACE by cutitaru",
    title: "SPACE by cutitaru",
    description:
      "A platform of innovative SaaS tools and mini projects by cutitaru.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SPACE by cutitaru",
    description:
      "A platform of innovative SaaS tools and mini projects by cutitaru.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
