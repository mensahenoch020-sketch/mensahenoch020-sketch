import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, TrendingDown, Flame, Target, Award, Calendar, BarChart3 } from "lucide-react";

interface PerformanceSummaryData {
  period: string;
  predictions: { total: number; wins: number; losses: number; accuracy: number };
  bankroll: { totalStaked: number; totalReturns: number; profit: number; roi: number; wins: number; losses: number };
  streaks: { currentStreak: number; longestWinStreak: number; longestLossStreak: number };
  competitionStats: { name: string; accuracy: number; total: number }[];
  dailyResults: { date: string; accuracy: number; total: number; wins: number }[];
}

type Period = "week" | "month" | "all";

const periodLabels: Record<Period, string> = {
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

export default function PerformanceSummary() {
  const [period, setPeriod] = useState<Period>("week");

  const { data, isLoading } = useQuery<PerformanceSummaryData>({
    queryKey: ["/api/performance-summary", period],
    queryFn: async () => {
      const res = await fetch(`/api/performance-summary?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch performance summary");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const predictions = data?.predictions ?? { total: 0, wins: 0, losses: 0, accuracy: 0 };
  const bankroll = data?.bankroll ?? { totalStaked: 0, totalReturns: 0, profit: 0, roi: 0, wins: 0, losses: 0 };
  const streaks = data?.streaks ?? { currentStreak: 0, longestWinStreak: 0, longestLossStreak: 0 };
  const competitionStats = data?.competitionStats ?? [];
  const dailyResults = data?.dailyResults ?? [];

  const streakIsWin = streaks.currentStreak >= 0;
  const streakAbs = Math.abs(streaks.currentStreak);

  const maxDailyTotal = Math.max(...dailyResults.map(d => d.total), 1);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60" data-testid="button-back-performance">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white" data-testid="text-performance-title">
            Performance Summary
          </h1>
          <p className="text-sm text-white/50 mt-0.5">Your prediction recap at a glance</p>
        </div>
      </div>

      <div className="flex gap-2" data-testid="period-selector">
        {(["week", "month", "all"] as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "ghost"}
            className={period === p ? "bg-[#00FFA3] text-black font-bold" : "text-white/60"}
            onClick={() => setPeriod(p)}
            data-testid={`button-period-${p}`}
          >
            {periodLabels[p]}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-total-predictions">
          <div className="w-10 h-10 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
            <Target className="w-5 h-5 text-[#00FFA3]" />
          </div>
          <span className="font-mono font-black text-3xl md:text-4xl text-white">{predictions.total}</span>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">Total Predictions</p>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-accuracy">
          <div className="w-10 h-10 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
            <Award className="w-5 h-5 text-[#00FFA3]" />
          </div>
          <span className="font-mono font-black text-3xl md:text-4xl text-[#00FFA3]">{predictions.accuracy}%</span>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">Accuracy</p>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-profit">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3"
            style={{
              backgroundColor: bankroll.profit >= 0 ? "rgba(0,255,163,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${bankroll.profit >= 0 ? "rgba(0,255,163,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>
            {bankroll.profit >= 0
              ? <TrendingUp className="w-5 h-5 text-[#00FFA3]" />
              : <TrendingDown className="w-5 h-5 text-[#EF4444]" />}
          </div>
          <span className={`font-mono font-black text-3xl md:text-4xl ${bankroll.profit >= 0 ? "text-[#00FFA3]" : "text-[#EF4444]"}`}>
            {bankroll.profit >= 0 ? "+" : ""}${bankroll.profit.toFixed(2)}
          </span>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">Profit/Loss</p>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-roi">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3"
            style={{
              backgroundColor: bankroll.roi >= 0 ? "rgba(0,255,163,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${bankroll.roi >= 0 ? "rgba(0,255,163,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>
            <BarChart3 className="w-5 h-5" style={{ color: bankroll.roi >= 0 ? "#00FFA3" : "#EF4444" }} />
          </div>
          <span className={`font-mono font-black text-3xl md:text-4xl ${bankroll.roi >= 0 ? "text-[#00FFA3]" : "text-[#EF4444]"}`}>
            {bankroll.roi}%
          </span>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">ROI</p>
        </Card>
      </div>

      <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5" data-testid="section-streaks">
        <div className="flex items-center gap-2 mb-5">
          <Flame className="w-5 h-5 text-[#FFB800]" />
          <h3 className="font-display font-bold text-white">Streaks</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2">Current Streak</p>
            <div className="flex items-center justify-center gap-2">
              {streakIsWin ? (
                <Flame className="w-5 h-5 text-[#FFB800]" />
              ) : (
                <TrendingDown className="w-5 h-5 text-[#EF4444]" />
              )}
              <span className={`font-mono font-black text-2xl ${streakIsWin ? "text-[#FFB800]" : "text-[#EF4444]"}`}>
                {streakAbs}
              </span>
              <Badge className={streakIsWin ? "bg-[#FFB800]/15 text-[#FFB800] border-[#FFB800]/30" : "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"}>
                {streakIsWin ? "W" : "L"}
              </Badge>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2">Longest Win Streak</p>
            <div className="flex items-center justify-center gap-2">
              <Flame className="w-5 h-5 text-[#00FFA3]" />
              <span className="font-mono font-black text-2xl text-[#00FFA3]">{streaks.longestWinStreak}</span>
              <Badge className="bg-[#00FFA3]/15 text-[#00FFA3] border-[#00FFA3]/30">W</Badge>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2">Longest Loss Streak</p>
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#EF4444]" />
              <span className="font-mono font-black text-2xl text-[#EF4444]">{streaks.longestLossStreak}</span>
              <Badge className="bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30">L</Badge>
            </div>
          </div>
        </div>
      </Card>

      {competitionStats.length > 0 && (
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5" data-testid="section-competitions">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-5 h-5 text-[#00FFA3]" />
            <h3 className="font-display font-bold text-white">Competition Breakdown</h3>
            <span className="text-xs text-white/30 ml-auto font-mono">{competitionStats.length} competitions</span>
          </div>
          <div className="space-y-3">
            {competitionStats.map((comp, i) => {
              const color = comp.accuracy >= 60 ? "#00FFA3" : comp.accuracy >= 40 ? "#FFB800" : "#EF4444";
              return (
                <div key={i} className="flex items-center gap-3" data-testid={`competition-stat-${i}`}>
                  <span className="text-xs text-white/30 font-mono w-4">{i + 1}</span>
                  <span className="text-sm text-white font-bold flex-1 truncate">{comp.name}</span>
                  <span className="text-[10px] text-white/30 font-mono">{comp.total} matches</span>
                  <div className="w-24">
                    <MiniBar value={comp.accuracy} max={100} color={color} />
                  </div>
                  <span className="text-sm font-mono font-bold w-12 text-right" style={{ color }}>{comp.accuracy}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {dailyResults.length > 0 && (
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5" data-testid="section-daily">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-5 h-5 text-[#00FFA3]" />
            <h3 className="font-display font-bold text-white">Daily Accuracy</h3>
          </div>
          <div className="flex items-end gap-1 h-32">
            {dailyResults.map((day, i) => {
              const height = maxDailyTotal > 0 ? (day.accuracy / 100) * 100 : 0;
              const color = day.accuracy >= 60 ? "#00FFA3" : day.accuracy >= 40 ? "#FFB800" : "#EF4444";
              const dateLabel = new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative" data-testid={`daily-bar-${i}`}>
                  <div className="invisible group-hover:visible absolute -top-14 bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap z-10">
                    <p className="font-bold">{dateLabel}</p>
                    <p className="font-mono">{day.wins}/{day.total} correct ({day.accuracy}%)</p>
                  </div>
                  <span className="text-[9px] font-mono text-white/30">{day.accuracy}%</span>
                  <div
                    className="w-full rounded-t transition-all duration-500"
                    style={{ height: `${Math.max(height, 4)}%`, backgroundColor: color, minHeight: "2px" }}
                  />
                  <span className="text-[8px] text-white/20 font-mono truncate w-full text-center">
                    {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {predictions.total === 0 && (
        <Card className="bg-[#0d1520] border border-white/10 rounded-xl p-12 text-center">
          <Target className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-white mb-2">No Data for {periodLabels[period]}</h3>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            There are no finished predictions for this period yet. Check back after some matches are played!
          </p>
        </Card>
      )}
    </div>
  );
}
