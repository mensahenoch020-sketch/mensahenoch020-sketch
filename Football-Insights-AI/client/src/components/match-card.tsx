import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, TrendingUp, Plus, Check, Zap, HelpCircle } from "lucide-react";
import { useBetSlip } from "@/lib/bet-slip-context";
import type { MatchPrediction } from "@shared/schema";

const marketExplanations: Record<string, string> = {
  "1X2": "Who wins? Home team (1), Draw (X), or Away team (2)",
  "Double Chance": "Two outcomes covered — safer bet with lower odds",
  "BTTS (GG/NG)": "Will both teams score at least one goal?",
  "Over/Under 2.5": "Will there be 3 or more goals (Over) or 2 or fewer (Under)?",
  "Over/Under 1.5": "Will there be 2+ goals (Over) or 0-1 goals (Under)?",
  "Over/Under 3.5": "Will there be 4+ goals (Over) or 3 or fewer (Under)?",
};

function AnimatedConfidenceMeter({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const radius = size === "md" ? 18 : 14;
  const stroke = size === "md" ? 3 : 2.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 60 ? "#00FFA3" : value >= 40 ? "#FFB800" : "#EF4444";
  const dim = (radius + stroke) * 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <span className={`absolute font-mono font-black ${size === "md" ? "text-xs" : "text-[9px]"}`} style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: "Low" | "Mid" | "High" }) {
  const styles = {
    High: "bg-[#00FFA3]/15 text-[#00FFA3] border-[#00FFA3]/30",
    Mid: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Low: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const labels = {
    High: "High Confidence",
    Mid: "Moderate",
    Low: "Risky",
  };
  return (
    <Badge variant="outline" className={`text-[10px] font-bold ${styles[level]}`} data-testid={`badge-confidence-${level.toLowerCase()}`}>
      {labels[level]}
    </Badge>
  );
}

function getRelativeTime(dateStr: string): string {
  const matchTime = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = matchTime - now;

  if (diffMs < 0) return "";
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);

  if (hours === 0 && mins <= 0) return "Starting now";
  if (hours === 0) return `In ${mins}m`;
  if (hours < 24) return `In ${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();
  return "";
}

export function MatchCard({ prediction }: { prediction: MatchPrediction }) {
  const { addItem, isInSlip } = useBetSlip();

  const matchTime = new Date(prediction.matchDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const matchDay = new Date(prediction.matchDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const isLive = prediction.status === "IN_PLAY";
  const isFinished = prediction.status === "FINISHED";
  const hasScore = prediction.score && prediction.score.fullTime.home !== null && prediction.score.fullTime.away !== null;
  const topMarkets = prediction.markets.slice(0, 3);
  const relTime = !isLive && !isFinished ? getRelativeTime(prediction.matchDate) : "";

  const handleAddToSlip = (e: React.MouseEvent, market: typeof prediction.markets[0]) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      matchId: prediction.matchId,
      homeTeam: prediction.homeTeam,
      awayTeam: prediction.awayTeam,
      competition: prediction.competition,
      market,
    });
  };

  return (
    <Link href={`/match/${prediction.matchId}`}>
      <Card
        className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-0 cursor-pointer transition-all duration-200 hover:border-[#00FFA3]/40 hover:shadow-[0_0_20px_rgba(0,255,163,0.08)] hover:-translate-y-0.5 group overflow-hidden"
        data-testid={`match-card-${prediction.matchId}`}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2 min-w-0">
            {prediction.competitionEmblem && (
              <img src={prediction.competitionEmblem} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
            )}
            <span className="text-[10px] text-[#00FFA3] uppercase tracking-wider font-bold truncate">
              {prediction.competition}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLive ? (
              <Badge className="bg-[#00FFA3] text-black text-[10px] font-bold gap-1 px-2 py-0.5 animate-pulse">
                <span className="w-1.5 h-1.5 bg-black rounded-full" />
                LIVE
              </Badge>
            ) : isFinished ? (
              <span className="text-[10px] text-white/40 font-mono">FT</span>
            ) : (
              <div className="flex items-center gap-1.5">
                {relTime && (
                  <span className="text-[9px] text-[#00FFA3]/70 font-bold">{relTime}</span>
                )}
                <span className="text-[10px] text-white/50 font-mono">{matchDay} · {matchTime}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {prediction.homeCrest ? (
                <img src={prediction.homeCrest} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-[#00FFA3]">{prediction.homeTeam.charAt(0)}</span>
                </div>
              )}
              <span className="text-sm font-bold text-white truncate" data-testid={`text-home-${prediction.matchId}`}>
                {prediction.homeTeam}
              </span>
            </div>
            {hasScore ? (
              <span className={`text-lg font-mono font-black ${isLive ? "text-[#00FFA3]" : "text-white"}`} data-testid={`score-home-${prediction.matchId}`}>
                {prediction.score!.fullTime.home}
              </span>
            ) : (
              <span className="text-sm font-mono font-black text-[#00FFA3]">{prediction.homeWinProb}%</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {prediction.awayCrest ? (
                <img src={prediction.awayCrest} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-white/60">{prediction.awayTeam.charAt(0)}</span>
                </div>
              )}
              <span className="text-sm font-bold text-white truncate" data-testid={`text-away-${prediction.matchId}`}>
                {prediction.awayTeam}
              </span>
            </div>
            {hasScore ? (
              <span className={`text-lg font-mono font-black ${isLive ? "text-[#00FFA3]" : "text-white"}`} data-testid={`score-away-${prediction.matchId}`}>
                {prediction.score!.fullTime.away}
              </span>
            ) : (
              <span className="text-sm font-mono font-black text-white/70">{prediction.awayWinProb}%</span>
            )}
          </div>

          {hasScore && prediction.score!.halfTime.home !== null && (
            <div className="text-center mb-2">
              <span className="text-[10px] text-white/30 font-mono">
                HT: {prediction.score!.halfTime.home} - {prediction.score!.halfTime.away}
              </span>
            </div>
          )}

          <div className="mb-1">
            <div className="h-1.5 rounded-full overflow-hidden flex gap-0.5">
              <div className="bg-[#00FFA3] rounded-l-full transition-all duration-700" style={{ width: `${prediction.homeWinProb}%` }} />
              <div className="bg-amber-400 transition-all duration-700" style={{ width: `${prediction.drawProb}%` }} />
              <div className="bg-white/40 rounded-r-full transition-all duration-700" style={{ width: `${prediction.awayWinProb}%` }} />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[8px] text-[#00FFA3]/60 font-mono font-bold">H</span>
              <span className="text-[8px] text-amber-400/60 font-mono font-bold">D</span>
              <span className="text-[8px] text-white/30 font-mono font-bold">A</span>
            </div>
          </div>

          <div className="mb-3 mt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3 h-3 text-[#00FFA3]" />
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Top 3 Picks</span>
              <Tooltip>
                <TooltipTrigger onClick={(e) => e.preventDefault()}>
                  <HelpCircle className="w-3 h-3 text-white/20" />
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[220px]">
                  <p className="text-[11px]">These are our AI's 3 best picks for this match. Higher % = more confident. Tap + to save a pick.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-1.5">
              {topMarkets.map((market, i) => {
                const inSlip = isInSlip(prediction.matchId, market.market);
                const explanation = marketExplanations[market.market];
                return (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 transition-all duration-200 hover:bg-white/[0.06]">
                    <AnimatedConfidenceMeter value={market.confidence} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{market.market}</span>
                        {explanation && (
                          <Tooltip>
                            <TooltipTrigger onClick={(e) => e.preventDefault()}>
                              <HelpCircle className="w-2.5 h-2.5 text-white/15" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[200px]">
                              <p className="text-[11px]">{explanation}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white truncate block">{market.pick}</span>
                    </div>
                    <button
                      onClick={(e) => handleAddToSlip(e, market)}
                      className={`p-1.5 rounded-lg transition-all duration-200 ${
                        inSlip ? "bg-[#00FFA3]/20 text-[#00FFA3] scale-110" : "bg-white/5 text-white/20 hover:bg-[#00FFA3]/10 hover:text-[#00FFA3] hover:scale-110"
                      }`}
                      data-testid={`button-add-slip-${prediction.matchId}-${i}`}
                    >
                      {inSlip ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {prediction.aiSummary && (
            <div className="mb-3 p-2.5 rounded-lg bg-[#00FFA3]/[0.04] border border-[#00FFA3]/10">
              <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2">
                {prediction.aiSummary.split('\n')[0]}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
            <ConfidenceBadge level={prediction.overallConfidence} />
            <div className="flex items-center gap-1 text-[10px] text-white/30 group-hover:text-[#00FFA3] transition-colors">
              <TrendingUp className="w-3 h-3" />
              <span>Full Analysis</span>
              <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
