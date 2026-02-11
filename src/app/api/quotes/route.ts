import { NextRequest, NextResponse } from "next/server";

type FmpQuote = {
  symbol?: string;
  price?: number;
};

type CacheEntry = {
  expiresAt: number;
  data: Record<string, number | null>;
};

const TTL_MS = 60_000;
const quoteCache = new Map<string, CacheEntry>();

function normalizeSymbols(input: string | null): string[] {
  if (!input) return [];

  return [...new Set(
    input
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  )];
}

export async function GET(req: NextRequest) {
  const symbols = normalizeSymbols(req.nextUrl.searchParams.get("symbols"));

  if (!symbols.length) {
    return NextResponse.json({ error: "Missing symbols query parameter" }, { status: 400 });
  }

  const cacheKey = symbols.slice().sort().join(",");
  const now = Date.now();
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
      },
    });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FMP_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const fmpUrl = `https://financialmodelingprep.com/api/v3/quote/${symbols.join(",")}?apikey=${apiKey}`;
    const response = await fetch(fmpUrl, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json({ error: `FMP upstream error (${response.status})` }, { status: 502 });
    }

    const payload = (await response.json()) as FmpQuote[];
    const data: Record<string, number | null> = {};

    for (const symbol of symbols) {
      data[symbol] = null;
    }

    for (const item of payload) {
      const symbol = item.symbol?.toUpperCase();
      if (!symbol || !symbols.includes(symbol)) continue;
      data[symbol] = typeof item.price === "number" ? item.price : null;
    }

    quoteCache.set(cacheKey, { data, expiresAt: now + TTL_MS });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 502 });
  }
}
