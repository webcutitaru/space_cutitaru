import {
  analyzeEtsyHtml,
  buildBenchmarkInsight,
  type BenchmarkInsight,
  type ListingReport,
} from "@/lib/etsy-analyzer";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_LISTINGS = 5;
const MAX_TOTAL_CHARS = 8_000_000;
const MAX_ONE_CHARS = 4_000_000;

function slimReport(report: ListingReport): ListingReport {
  return {
    ...report,
    identity: {
      ...report.identity,
      description: report.identity.description?.slice(0, 4000),
    },
    sources: {
      meta: {
        ...report.sources.meta,
        raw: {},
      },
      jsonLd: {
        products: report.sources.jsonLd.products.slice(0, 2),
        other: [],
      },
      appState: {
        blobs: [],
        listingCandidates: report.sources.appState.listingCandidates.slice(0, 1).map((c) => {
          // Keep candidate keys shallow — drop nested mega blobs
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(c)) {
            if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v == null) {
              out[k] = v;
            }
          }
          return out as ListingReport["sources"]["appState"]["listingCandidates"][number];
        }),
      },
      dom: report.sources.dom,
    },
  };
}

function slimInsight(insight: BenchmarkInsight): BenchmarkInsight {
  return {
    ...insight,
    reports: insight.reports.map(slimReport),
  };
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_TOTAL_CHARS + 100_000) {
      return NextResponse.json(
        { error: "Payload prea mare. Trimite max ~8MB HTML total." },
        { status: 413 },
      );
    }

    const body = (await request.json()) as { htmls?: unknown };

    if (!Array.isArray(body.htmls)) {
      return NextResponse.json(
        { error: "Body invalid: aștept { htmls: string[] }." },
        { status: 400 },
      );
    }

    const htmls = body.htmls
      .filter((h): h is string => typeof h === "string")
      .map((h) => h.trim())
      .filter(Boolean);

    if (htmls.length === 0) {
      return NextResponse.json(
        { error: "Lipește cel puțin un HTML de listing." },
        { status: 400 },
      );
    }

    if (htmls.length > MAX_LISTINGS) {
      return NextResponse.json(
        { error: `Maxim ${MAX_LISTINGS} listing-uri odată.` },
        { status: 400 },
      );
    }

    const totalChars = htmls.reduce((n, h) => n + h.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json(
        { error: "HTML total prea mare (max ~8MB)." },
        { status: 413 },
      );
    }

    for (let i = 0; i < htmls.length; i++) {
      if (htmls[i]!.length > MAX_ONE_CHARS) {
        return NextResponse.json(
          { error: `Listing ${i + 1} e prea mare (max ~4MB per HTML).` },
          { status: 413 },
        );
      }
    }

    const reports: ListingReport[] = [];
    const errors: string[] = [];

    for (let i = 0; i < htmls.length; i++) {
      try {
        reports.push(analyzeEtsyHtml(htmls[i]!));
      } catch (e) {
        errors.push(
          `Listing ${i + 1}: ${e instanceof Error ? e.message : "eroare"}`,
        );
      }
    }

    if (reports.length === 0) {
      return NextResponse.json(
        { error: errors.join(" · ") || "Niciun listing valid." },
        { status: 422 },
      );
    }

    const insight = slimInsight(buildBenchmarkInsight(reports));

    return NextResponse.json({
      insight,
      warnings: errors.length ? errors : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analiza a eșuat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
