import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, TrendingUp, CheckCircle, AlertTriangle, Target, HelpCircle, ChevronRight, Clock, Calendar, Trophy, XCircle, MinusCircle } from "lucide-react";

interface DailyPick {
  id?: number;
  matchId: number;
  pickType: string;
  pick: string;
  confidence: string;
  reasoning?: string;
  pickDate?: string;
  matchDate?: string;
  homeTeam?: string;
  awayTeam?: string;
  competition?: string;
  result?: "pending" | "won" | "lost" | "void";
}

interface DailyPicksResponse {
  picks: DailyPick[];
  refreshInfo: {
    nextRefresh: string;
    msUntil: number;
  };
  pickDate: string;
}

function AnimatedConfidenceMeter({ value, color }: { value: number; color: string }) {
  const radius = 24;
  const stroke = 3.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const dim = (radius + stroke) * 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <span className="absolute text-xs font-mono font-black" style={{ color }}>{value}%</span>
    </div>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Refreshing soon...";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function ResultBadge({ result }: { result?: string }) {
  if (!result || result === "pending") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-white/20 text-white/50">
        <Clock className="w-2.5 h-2.5" />
        Pending
      </Badge>
    );
  }
  if (result === "won") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-[#00FFA3]/40 text-[#00FFA3]">
        <Trophy className="w-2.5 h-2.5" />
        Won
      </Badge>
    );
  }
  if (result === "lost") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-red-400/40 text-red-400">
        <XCircle className="w-2.5 h-2.5" />
        Lost
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1 border-white/20 text-white/40">
      <MinusCircle className="w-2.5 h-2.5" />
      Void
    </Badge>
  );
}

export default function DailyPicks() {
  const { data, isLoading } = useQuery<DailyPicksResponse>({
    queryKey: ["/api/daily-picks"],
  });

  const picks = data?.picks;
  const refreshInfo = data?.refreshInfo;
  const pickDate = data?.pickDate;

  const [msRemaining, setMsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (refreshInfo?.msUntil != null) {
      setMsRemaining(refreshInfo.msUntil);
    }
  }, [refreshInfo?.msUntil]);

  useEffect(() => {
    if (msRemaining == null || msRemaining <= 0) return;
    const interval = setInterval(() => {
      setMsRemaining((prev) => {
        if (prev == null || prev <= 60000) return 0;
        return prev - 60000;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [msRemaining]);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" data-testid="button-back-picks">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white" data-testid="text-daily-picks-title">
            Daily AI Picks
          </h1>
          <p className="text-sm text-white/50 mt-1 flex items-center gap-1.5 flex-wrap">
            Top predictions selected by our statistical models
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-white/20" />
              </TooltipTrigger>
              <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[240px]">
                <p className="text-xs">These are our AI's best picks of the day. We rank all matches by confidence and show you the top 5. Green = high confidence, Amber = moderate, Red = risky.</p>
              </TooltipContent>
            </Tooltip>
          </p>
        </div>
      </div>

      {(pickDate || msRemaining != null) && (
        <div className="flex items-center gap-4 flex-wrap">
          {pickDate && (
            <div className="flex items-center gap-2 text-sm text-white/60" data-testid="text-pick-date">
              <Calendar className="w-4 h-4 text-[#00FFA3]/70" />
              <span>{pickDate}</span>
            </div>
          )}
          {msRemaining != null && (
            <div className="flex items-center gap-2 text-sm text-white/60" data-testid="text-countdown">
              <Clock className="w-4 h-4 text-[#00FFA3]/70" />
              <span>Next refresh in {formatCountdown(msRemaining)}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-[#0d1520] border border-[#00FFA3]/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00FFA3]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-[#00FFA3]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-1">How Daily Picks Work</p>
            <p className="text-xs text-white/50 leading-relaxed">Our AI analyzes all upcoming matches using advanced statistics — Poisson models, Elo ratings, and 5,000 Monte Carlo simulations. The picks below are ranked by confidence level. Tap any pick to see the full match analysis.</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : picks && picks.length > 0 ? (
        <div className="space-y-3">
          {picks.map((pick, i) => {
            const isHigh = pick.confidence === "High";
            const isMid = pick.confidence === "Mid";
            const color = isHigh ? "#00FFA3" : isMid ? "#FFB800" : "#EF4444";
            const confValue = isHigh ? 78 : isMid ? 55 : 35;
            return (
              <Link key={pick.id ?? i} href={`/match/${pick.matchId}`}>
                <Card
                  className={`p-0 cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden ${
                    isHigh ? "bg-[#0d1520] border-[#00FFA3]/20 hover:border-[#00FFA3]/40" :
                    isMid ? "bg-[#0d1520] border-[#FFB800]/20 hover:border-[#FFB800]/40" :
                    "bg-[#0d1520] border-red-400/20 hover:border-red-400/40"
                  }`}
                  data-testid={`daily-pick-card-${pick.id ?? i}`}
                >
                  <div className="flex items-center gap-4 p-5">
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-mono font-bold text-white/30">#{i + 1}</span>
                      <AnimatedConfidenceMeter value={confValue} color={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{pick.pickType}</span>
                        <Badge variant="outline" className={`text-[10px] gap-1 ${
                          isHigh ? "border-[#00FFA3]/30 text-[#00FFA3]" :
                          isMid ? "border-[#FFB800]/30 text-[#FFB800]" :
                          "border-red-400/30 text-red-400"
                        }`}>
                          {isHigh ? <CheckCircle className="w-2.5 h-2.5" /> :
                           isMid ? <TrendingUp className="w-2.5 h-2.5" /> :
                           <AlertTriangle className="w-2.5 h-2.5" />}
                          {isHigh ? "Strong Pick" : isMid ? "Moderate" : "Risky"}
                        </Badge>
                        {pick.id != null && <ResultBadge result={pick.result} />}
                      </div>
                      {pick.homeTeam && pick.awayTeam && (
                        <p className="text-xs text-white/50 mb-1 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white/70">{pick.homeTeam}</span>
                          <span className="text-white/30">vs</span>
                          <span className="font-semibold text-white/70">{pick.awayTeam}</span>
                          {pick.competition && (
                            <span className="text-white/30">· {pick.competition}</span>
                          )}
                        </p>
                      )}
                      <p className="text-base font-bold text-white mb-1.5">{pick.pick}</p>
                      {pick.reasoning && (
                        <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{pick.reasoning}</p>
                      )}
                      {pick.matchDate && (
                        <p className="text-[10px] text-white/30 mt-1.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {pick.matchDate}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20 flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0d1520] border border-white/10 rounded-xl p-12 text-center">
          <Zap className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-white mb-2">No Picks Available</h3>
          <p className="text-sm text-white/50">Check back later for today's top AI predictions.</p>
        </div>
      )}
    </div>
  );
}
