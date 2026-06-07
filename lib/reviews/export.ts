import type { Review } from "@/lib/reviews/types";

export function reviewsToCsv(reviews: Review[]): string {
  const headers = [
    "product_title",
    "product_handle",
    "product_url",
    "rating",
    "title",
    "body",
    "author",
    "date",
    "provider",
    "verified",
    "image_urls",
  ];

  const escape = (value: string | number | boolean | undefined) => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = reviews.map((review) =>
    [
      review.productTitle,
      review.productHandle,
      review.productUrl,
      review.rating,
      review.title,
      review.body,
      review.author,
      review.date,
      review.provider,
      review.verified ? "yes" : "no",
      (review.imageUrls ?? []).join(" | "),
    ]
      .map(escape)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
