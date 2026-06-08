import type { Metadata } from "next";
import { ImageConvertApp } from "@/components/image-convert/ImageConvertApp";

export const metadata: Metadata = {
  title: "Image Converter",
  description:
    "Convert JPEG and PNG to WebP instantly. Preview in browser, export high-quality WebP with one click.",
  openGraph: {
    title: "Image Converter | SPACE by cutitaru",
    description:
      "Convert JPEG and PNG to WebP instantly. Preview in browser, export high-quality WebP with one click.",
    url: "https://space.cutitaru.com/image-converter",
  },
};

export default function ImageConverterPage() {
  return <ImageConvertApp />;
}
