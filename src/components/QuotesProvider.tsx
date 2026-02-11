"use client";

import { createContext, useContext } from "react";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";

type QuotesContextValue = {
  quotes: Record<string, number | null>;
  loading: boolean;
};

const QuotesContext = createContext<QuotesContextValue>({ quotes: {}, loading: true });

export function QuotesProvider({ symbols, children }: { symbols: string[]; children: React.ReactNode }) {
  const value = useLiveQuotes(symbols);
  return <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>;
}

export function useQuotes() {
  return useContext(QuotesContext);
}
