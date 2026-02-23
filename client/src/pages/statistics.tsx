import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Target, Award, XCircle, BarChart3, Percent, Trophy, Activity, Flame, Frown } from "lucide-react";
import type { MatchPrediction } from "@shared/schema";

interface StreakData {
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  lastResult: string;
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <span className="font-mono font-black text-3xl md:text-4xl" data-testid={`counter-${value}`}>
      {value}{suffix}
    </span>
  );
}

function DonutChart({ value, label, color, size = 120 }: { value: number; label: string; color: string; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono font-black text-xl" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-xs text-white/50 font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

function TrendBar({ values, maxVal }: { values: number[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {values.map((v, i) => {
        const height = maxVal > 0 ? (v / maxVal) * 100 : 0;
        const color = v >= 60 ? "#00FFA3" : v >= 40 ? "#FFB800" : "#EF4444";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-t transition-all duration-500"
              style={{ height: `${Math.max(height, 4)}%`, backgroundColor: color, minHeight: "2px" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function Statistics() {
  const { data: predictions, isLoading } = useQuery<MatchPrediction[]>({
    queryKey: ["/api/statistics"],
  });

  const { data: streaks } = useQuery<StreakData>({
    queryKey: ["/api/streaks"],
  });

  const stats = useMemo(() => {
    if (!predictions || predictions.length === 0) {
      return {
        total: 0, finished: 0, wins: 0, losses: 0, accuracy: 0,
        highConfWinRate: 0, midConfWinRate: 0, lowConfWinRate: 0,
        highCount: 0, midCount: 0, lowCount: 0,
        marketStats: [] as { market: string; correct: number; total: number; pct: number }[],
        trendValues: [] as number[],
        topLeagues: [] as { name: string; accuracy: number; total: number }[],
      };
    }

    const finished = predictions.filter(p => p.status === "FINISHED" && p.score && p.score.fullTime.home !== null);

    let wins = 0;
    let losses = 0;
    const marketCorrect: Record<string, { correct: number; total: number }> = {};
    const leagueCorrect: Record<string, { correct: number; total: number }> = {};
    const confBuckets: Record<string, { correct: number; total: number }> = {
      High: { correct: 0, total: 0 },
      Mid: { correct: 0, total: 0 },
      Low: { correct: 0, total: 0 },
    };

    function evaluate1X2(match: MatchPrediction, actualResult: string): boolean | null {
      const m1x2 = match.markets.find(m => m.market === "1X2");
      if (!m1x2) return null;
      const pick = m1x2.pick.toLowerCase();
      const predicted = pick.includes("draw") ? "draw" :
        pick.includes(match.homeTeam.toLowerCase().split(" ")[0]) ? "home" : "away";
      return predicted === actualResult;
    }

    for (const match of finished) {
      const homeGoals = match.score!.fullTime.home!;
      const awayGoals = match.score!.fullTime.away!;
      const actualResult = homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";
      const totalGoals = homeGoals + awayGoals;
      const bttsActual = homeGoals > 0 && awayGoals > 0;

      const matchCorrect1x2 = evaluate1X2(match, actualResult);
      if (matchCorrect1x2 !== null) {
        if (matchCorrect1x2) wins++;
        else losses++;
      }

      confBuckets[match.overallConfidence].total++;
      if (matchCorrect1x2 !== null && matchCorrect1x2) {
        confBuckets[match.overallConfidence].correct++;
      }

      for (const market of match.markets) {
        let isCorrect = false;
        let canEvaluate = true;

        if (market.market === "1X2") {
          const pick = market.pick.toLowerCase();
          const predicted = pick.includes("draw") ? "draw" :
            pick.includes(match.homeTeam.toLowerCase().split(" ")[0]) ? "home" : "away";
          isCorrect = predicted === actualResult;
        } else if (market.market.includes("BTTS")) {
          isCorrect = (market.pick.includes("Yes") || market.pick.includes("GG")) === bttsActual;
        } else if (market.market === "Over/Under 2.5") {
          isCorrect = market.pick.includes("Over") ? totalGoals > 2.5 : totalGoals < 2.5;
        } else if (market.market === "Over/Under 1.5") {
          isCorrect = market.pick.includes("Over") ? totalGoals > 1.5 : totalGoals < 1.5;
        } else if (market.market === "Over/Under 3.5") {
          isCorrect = market.pick.includes("Over") ? totalGoals > 3.5 : totalGoals < 3.5;
        } else if (market.market === "Double Chance") {
          const pick = market.pick.toLowerCase();
          if (pick.includes("draw")) {
            isCorrect = actualResult === "draw" ||
              (pick.includes(match.homeTeam.toLowerCase().split(" ")[0]) && actualResult === "home") ||
              (pick.includes(match.awayTeam.toLowerCase().split(" ")[0]) && actualResult === "away");
          } else {
            isCorrect = actualResult !== (pick.includes(match.homeTeam.toLowerCase().split(" ")[0]) ? "away" : "home");
          }
        } else if (market.market === "Correct Score") {
          isCorrect = market.pick === `${homeGoals}-${awayGoals}`;
        } else if (market.market === "Over/Under 4.5") {
          isCorrect = market.pick.includes("Over") ? totalGoals > 4.5 : totalGoals < 4.5;
        } else if (market.market.includes("Asian Handicap -0.5")) {
          const pick = market.pick.toLowerCase();
          const predictedWinner = pick.includes(match.homeTeam.toLowerCase().split(" ")[0]) ? "home" : "away";
          isCorrect = predictedWinner === actualResult;
        } else if (market.market.includes("Asian Handicap -1.5")) {
          const pick = market.pick.toLowerCase();
          const predictedWinner = pick.includes(match.homeTeam.toLowerCase().split(" ")[0]) ? "home" : "away";
          const margin = Math.abs(homeGoals - awayGoals);
          isCorrect = predictedWinner === actualResult && margin >= 2;
        } else if (market.market === "Home Team Goals O/U 1.5") {
          isCorrect = market.pick.includes("Over") ? homeGoals > 1.5 : homeGoals < 1.5;
        } else if (market.market === "Away Team Goals O/U 1.5") {
          isCorrect = market.pick.includes("Over") ? awayGoals > 1.5 : awayGoals < 1.5;
        } else if (market.market === "Odd/Even Goals") {
          isCorrect = market.pick === "Odd" ? totalGoals % 2 === 1 : totalGoals % 2 === 0;
        } else {
          canEvaluate = false;
        }

        if (canEvaluate) {
          if (!marketCorrect[market.market]) {
            marketCorrect[market.market] = { correct: 0, total: 0 };
          }
          marketCorrect[market.market].total++;
          if (isCorrect) {
            marketCorrect[market.market].correct++;
          }
        }
      }

      if (!leagueCorrect[match.competition]) {
        leagueCorrect[match.competition] = { correct: 0, total: 0 };
      }
      leagueCorrect[match.competition].total++;
      if (matchCorrect1x2 !== null && matchCorrect1x2) {
        leagueCorrect[match.competition].correct++;
      }
    }

    const accuracy = finished.length > 0 ? Math.round((wins / finished.length) * 100) : 0;

    const marketStats = Object.entries(marketCorrect)
      .map(([market, { correct, total }]) => ({
        market,
        correct,
        total,
        pct: total > 0 ? Math.round((correct / total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 12);

    const trendValues: number[] = [];
    const batchSize = Math.max(1, Math.floor(finished.length / 10));
    for (let i = 0; i < finished.length; i += batchSize) {
      const batch = finished.slice(i, i + batchSize);
      let batchWins = 0;
      for (const m of batch) {
        const hg = m.score!.fullTime.home!;
        const ag = m.score!.fullTime.away!;
        const actual = hg > ag ? "home" : hg < ag ? "away" : "draw";
        const result = evaluate1X2(m, actual);
        if (result === true) batchWins++;
      }
      trendValues.push(batch.length > 0 ? Math.round((batchWins / batch.length) * 100) : 0);
    }

    const topLeagues = Object.entries(leagueCorrect)
      .map(([name, { correct, total }]) => ({
        name,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        total,
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 6);

    return {
      total: predictions.length,
      finished: finished.length,
      wins,
      losses,
      accuracy,
      highConfWinRate: confBuckets.High.total > 0 ? Math.round((confBuckets.High.correct / confBuckets.High.total) * 100) : 0,
      midConfWinRate: confBuckets.Mid.total > 0 ? Math.round((confBuckets.Mid.correct / confBuckets.Mid.total) * 100) : 0,
      lowConfWinRate: confBuckets.Low.total > 0 ? Math.round((confBuckets.Low.correct / confBuckets.Low.total) * 100) : 0,
      highCount: confBuckets.High.total,
      midCount: confBuckets.Mid.total,
      lowCount: confBuckets.Low.total,
      marketStats,
      trendValues,
      topLeagues,
    };
  }, [predictions]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const marketIcons: Record<string, string> = {
    "1X2": "W",
    "BTTS (GG/NG)": "GG",
    "Over/Under 2.5": "O/U",
    "Double Chance": "DC",
    "Over/Under 1.5": "1.5",
    "Over/Under 3.5": "3.5",
    "Correct Score": "CS",
    "Asian Handicap -0.5": "AH",
    "HT/FT": "HF",
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" data-testid="button-back-stats">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white" data-testid="text-statistics-title">
            AI Performance
          </h1>
          <p className="text-sm text-white/50 mt-0.5">How accurate are our predictions?</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-total">
          <div className="w-10 h-10 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
            <Target className="w-5 h-5 text-[#00FFA3]" />
          </div>
          <AnimatedCounter value={stats.total} />
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">Total Predictions</p>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-wins">
          <div className="w-10 h-10 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
            <Award className="w-5 h-5 text-[#00FFA3]" />
          </div>
          <AnimatedCounter value={stats.wins} />
          <p className="text-xs text-[#00FFA3]/60 mt-1 uppercase tracking-wider font-bold">Correct</p>
        </Card>

        <Card className="bg-[#0d1520] border border-red-400/15 rounded-xl p-5 text-center" data-testid="stat-losses">
          <div className="w-10 h-10 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <AnimatedCounter value={stats.losses} />
          <p className="text-xs text-red-400/60 mt-1 uppercase tracking-wider font-bold">Incorrect</p>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-accuracy">
          <div className="w-10 h-10 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
            <Percent className="w-5 h-5 text-[#00FFA3]" />
          </div>
          <AnimatedCounter value={stats.accuracy} suffix="%" />
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">Accuracy</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5" data-testid="chart-confidence">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-[#00FFA3]" />
            <h3 className="font-display font-bold text-white">Win Rate by Confidence</h3>
          </div>
          <div className="flex items-center justify-around">
            <DonutChart value={stats.highConfWinRate} label={`High (${stats.highCount})`} color="#00FFA3" />
            <DonutChart value={stats.midConfWinRate} label={`Mid (${stats.midCount})`} color="#FFB800" />
            <DonutChart value={stats.lowConfWinRate} label={`Low (${stats.lowCount})`} color="#EF4444" />
          </div>
          <p className="text-[11px] text-white/30 text-center mt-4">Win rate for each confidence tier across finished matches</p>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5" data-testid="chart-trend">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-5 h-5 text-[#00FFA3]" />
            <h3 className="font-display font-bold text-white">Accuracy Trend</h3>
          </div>
          {stats.trendValues.length > 0 ? (
            <>
              <TrendBar values={stats.trendValues} maxVal={100} />
              <div className="flex justify-between mt-2 text-[10px] text-white/20 font-mono">
                <span>Oldest</span>
                <span>Latest</span>
              </div>
              <p className="text-[11px] text-white/30 text-center mt-3">Accuracy % across match batches over time</p>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-white/30 text-sm">
              No finished matches yet to show trends
            </div>
          )}
        </Card>
      </div>

      {streaks && (
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5" data-testid="chart-streaks">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="w-5 h-5 text-[#00FFA3]" />
            <h3 className="font-display font-bold text-white">Streak Tracker</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
              <div className={`text-2xl font-mono font-black ${streaks.currentStreak > 0 ? "text-[#00FFA3]" : streaks.currentStreak < 0 ? "text-red-400" : "text-white/40"}`}>
                {streaks.currentStreak > 0 ? `+${streaks.currentStreak}` : streaks.currentStreak}
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {streaks.currentStreak > 0 ? <Flame className="w-3 h-3 text-[#00FFA3]" /> : streaks.currentStreak < 0 ? <Frown className="w-3 h-3 text-red-400" /> : null}
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Current</p>
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
              <div className="text-2xl font-mono font-black text-[#00FFA3]">{streaks.longestWinStreak}</div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mt-1">Best Win Streak</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
              <div className="text-2xl font-mono font-black text-red-400">{streaks.longestLossStreak}</div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mt-1">Worst Loss Streak</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5" data-testid="chart-markets">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-[#00FFA3]" />
          <h3 className="font-display font-bold text-white">Market Accuracy</h3>
          <span className="text-xs text-white/30 ml-auto font-mono">{stats.marketStats.length} markets</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {stats.marketStats.map((m, i) => {
            const color = m.pct >= 60 ? "#00FFA3" : m.pct >= 40 ? "#FFB800" : "#EF4444";
            const icon = marketIcons[m.market] || m.market.slice(0, 2).toUpperCase();
            return (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-center" data-testid={`market-stat-${i}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  <span className="text-[10px] font-black" style={{ color }}>{icon}</span>
                </div>
                <p className="text-lg font-mono font-black" style={{ color }}>{m.pct}%</p>
                <p className="text-[10px] text-white/40 font-bold truncate mt-0.5">{m.market}</p>
                <p className="text-[9px] text-white/20 font-mono">{m.correct}/{m.total}</p>
                <MiniBar value={m.pct} max={100} color={color} />
              </div>
            );
          })}
        </div>
      </Card>

      {stats.topLeagues.length > 0 && (
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5" data-testid="chart-leagues">
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-5 h-5 text-[#00FFA3]" />
            <h3 className="font-display font-bold text-white">Top Leagues by Accuracy</h3>
          </div>
          <div className="space-y-3">
            {stats.topLeagues.map((league, i) => {
              const color = league.accuracy >= 60 ? "#00FFA3" : league.accuracy >= 40 ? "#FFB800" : "#EF4444";
              return (
                <div key={i} className="flex items-center gap-3" data-testid={`league-stat-${i}`}>
                  <span className="text-xs text-white/30 font-mono w-4">{i + 1}</span>
                  <span className="text-sm text-white font-bold flex-1 truncate">{league.name}</span>
                  <span className="text-[10px] text-white/30 font-mono">{league.total} matches</span>
                  <div className="w-24">
                    <MiniBar value={league.accuracy} max={100} color={color} />
                  </div>
                  <span className="text-sm font-mono font-bold w-12 text-right" style={{ color }}>{league.accuracy}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {stats.finished === 0 && (
        <Card className="bg-[#0d1520] border border-white/10 rounded-xl p-12 text-center">
          <Target className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-white mb-2">No Finished Matches Yet</h3>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Once matches finish, we'll track how accurate our predictions were. Check back after some matches are played to see detailed performance stats!
          </p>
        </Card>
      )}
    </div>
  );
}
