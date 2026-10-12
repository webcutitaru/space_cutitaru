import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { VisitPing } from "@/components/visit-ping/VisitPing";
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
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "ywp4j5z1zd");`}
        </Script>
        <VisitPing />
        {children}
      </body>
    </html>
  );
}
