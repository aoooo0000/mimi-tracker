export type SourceCategory =
  | "Mimivsjames"
  | "深度會員"
  | "長期投資"
  | "美股輕鬆談";

export interface Recommendation {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  recommendDate: string;
  recommendPrice: number;
  currentPrice?: number;
  targetPrice?: number;
  reason: string;
  articleTitle: string;
  articleDate: string;
  source: SourceCategory;
  notionPageId: string;
}

export interface RecommendationWithLive extends Recommendation {
  livePrice?: number;
  returnPct?: number;
}
