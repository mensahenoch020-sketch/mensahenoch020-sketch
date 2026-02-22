import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";

interface DailyPick {
  id: number;
  matchId: number;
  pickType: string;
  pick: string;
  confidence: string;
  reasoning?: string;
}

export function DailyPicksPanel({ picks, isLoading }: { picks?: DailyPick[]; isLoading: boolean }) {
  return (
    <Card className="glass-panel border-card-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#FFB800]/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-[#FFB800]" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-white text-sm">Daily AI Picks</h3>
          <p className="text-[10px] text-white/40">Top predictions for today</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-md" />)}
        </div>
      ) : picks && picks.length > 0 ? (
        <div className="space-y-2">
          {picks.map((pick, i) => {
            const isHigh = pick.confidence === "High";
            const isMid = pick.confidence === "Mid";
            return (
              <div
                key={pick.id || i}
                className={`p-3 rounded-md border transition-colors ${
                  isHigh ? "bg-[#00FFA3]/5 border-[#00FFA3]/20" :
                  isMid ? "bg-[#FFB800]/5 border-[#FFB800]/20" :
                  "bg-red-400/5 border-red-400/20"
                }`}
                data-testid={`daily-pick-${i}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-white/50 font-medium uppercase tracking-wider">{pick.pickType}</span>
                  <Badge variant="outline" className={`text-[10px] gap-1 ${
                    isHigh ? "border-[#00FFA3]/30 text-[#00FFA3]" :
                    isMid ? "border-[#FFB800]/30 text-[#FFB800]" :
                    "border-red-400/30 text-red-400"
                  }`}>
                    {isHigh ? <CheckCircle className="w-2.5 h-2.5" /> :
                     isMid ? <TrendingUp className="w-2.5 h-2.5" /> :
                     <AlertTriangle className="w-2.5 h-2.5" />}
                    {pick.confidence}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-white">{pick.pick}</p>
                {pick.reasoning && (
                  <p className="text-[11px] text-white/50 mt-1 line-clamp-2">{pick.reasoning}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Zap className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-xs text-white/40">No picks available yet</p>
        </div>
      )}
    </Card>
  );
}
