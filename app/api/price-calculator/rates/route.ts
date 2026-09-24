import { NextResponse } from "next/server";

export const revalidate = 21_600;

type FrankfurterResponse = {
  date?: string;
  rates?: { CNY?: number; EUR?: number };
};

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export async function GET() {
  try {
    const response = await fetch(
      "https://api.frankfurter.dev/v1/latest?from=USD&to=CNY,EUR",
      { next: { revalidate: 21_600 } },
    );
    if (!response.ok) {
      return NextResponse.json({ error: "Rate lookup failed." }, { status: 502 });
    }

    const data = (await response.json()) as FrankfurterResponse;
    const cny = data.rates?.CNY;
    const eur = data.rates?.EUR;
    if (!(cny > 0) || !(eur > 0) || !data.date) {
      return NextResponse.json({ error: "Rate lookup failed." }, { status: 502 });
    }

    return NextResponse.json({
      cnyPerUsd: round4(cny),
      eurPerUsd: round4(eur),
      date: data.date,
    });
  } catch {
    return NextResponse.json({ error: "Rate lookup failed." }, { status: 502 });
  }
}
