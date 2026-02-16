import { Suspense } from "react";
import AnalyzeClient from "@/components/AnalyzeClient";

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="card text-sm text-slate-400">分析器載入中...</div>}>
      <AnalyzeClient />
    </Suspense>
  );
}
