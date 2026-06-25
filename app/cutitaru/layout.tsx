import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./letter.css";

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["600"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: {
    default: "cutitaru",
    template: "%s | cutitaru",
  },
};

export default function CutitaruLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`letter-theme ${inter.variable} ${playfair.variable}`}
      data-theme="letter"
    >
      {children}
    </div>
  );
}
