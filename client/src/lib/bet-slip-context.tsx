import { createContext, useContext, useState, useCallback } from "react";
import type { PredictionMarket } from "@shared/schema";

export interface BetSlipItem {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  market: PredictionMarket;
}

interface BetSlipContextType {
  items: BetSlipItem[];
  addItem: (item: BetSlipItem) => void;
  removeItem: (matchId: number, market: string) => void;
  clearAll: () => void;
  isInSlip: (matchId: number, market: string) => boolean;
  combinedConfidence: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const BetSlipContext = createContext<BetSlipContextType | null>(null);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BetSlipItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((item: BetSlipItem) => {
    setItems(prev => {
      const exists = prev.some(i => i.matchId === item.matchId && i.market.market === item.market.market);
      if (exists) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((matchId: number, market: string) => {
    setItems(prev => prev.filter(i => !(i.matchId === matchId && i.market.market === market)));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const isInSlip = useCallback((matchId: number, market: string) => {
    return items.some(i => i.matchId === matchId && i.market.market === market);
  }, [items]);

  const combinedConfidence = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.market.confidence, 0) / items.length)
    : 0;

  return (
    <BetSlipContext.Provider value={{ items, addItem, removeItem, clearAll, isInSlip, combinedConfidence, isOpen, setIsOpen }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (!context) throw new Error("useBetSlip must be used within BetSlipProvider");
  return context;
}
