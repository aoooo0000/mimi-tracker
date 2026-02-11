import fs from "node:fs/promises";
import path from "node:path";
import { Recommendation } from "@/types/recommendation";

const dataPath = path.join(process.cwd(), "data", "recommendations.json");

export async function getRecommendations(): Promise<Recommendation[]> {
  const raw = await fs.readFile(dataPath, "utf-8");
  const records = JSON.parse(raw) as Recommendation[];
  return records.sort(
    (a, b) => new Date(b.recommendDate).getTime() - new Date(a.recommendDate).getTime(),
  );
}
