import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, History, CheckCircle, XCircle, Clock, Target, Trophy, Percent } from "lucide-react";

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

function ResultBadge({ result }: { result?: string }) {
  if (!result || result === "pending") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-amber-400/30 text-amber-400" data-testid="badge-pending">
        <Clock className="w-2.5 h-2.5" />
        Pending
      </Badge>
    );
  }
  if (result === "won") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-[#00FFA3]/40 text-[#00FFA3]" data-testid="badge-won">
        <CheckCircle className="w-2.5 h-2.5" />
        Won
      </Badge>
    );
  }
  if (result === "lost") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-red-400/40 text-red-400" data-testid="badge-lost">
        <XCircle className="w-2.5 h-2.5" />
        Lost
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1 border-white/20 text-white/40" data-testid="badge-void">
      <Clock className="w-2.5 h-2.5" />
      Void
    </Badge>
  );
}

export default function PickHistory() {
  const { data, isLoading } = useQuery<Record<string, DailyPick[]>>({
    queryKey: ["/api/daily-picks/history"],
  });

  const stats = useMemo(() => {
    if (!data) return { total: 0, wins: 0, losses: 0, winRate: 0 };
    const allPicks = Object.values(data).flat();
    const total = allPicks.length;
    const wins = allPicks.filter((p) => p.result === "won").length;
    const losses = allPicks.filter((p) => p.result === "lost").length;
    const decided = wins + losses;
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
    return { total, wins, losses, winRate };
  }, [data]);

  const sortedDates = useMemo(() => {
    if (!data) return [];
    return Object.keys(data).sort((a, b) => b.localeCompare(a));
  }, [data]);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60" data-testid="button-back-history">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white" data-testid="text-pick-history-title">
            Pick History
          </h1>
          <p className="text-sm text-white/50 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <History className="w-3.5 h-3.5 text-white/30" />
            Past daily picks and their results
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-total-picks">
              <div className="w-10 h-10 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
                <Target className="w-5 h-5 text-[#00FFA3]" />
              </div>
              <span className="font-mono font-black text-3xl text-white">{stats.total}</span>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">Total Picks</p>
            </Card>

            <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-wins">
              <div className="w-10 h-10 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-5 h-5 text-[#00FFA3]" />
              </div>
              <span className="font-mono font-black text-3xl text-[#00FFA3]">{stats.wins}</span>
              <p className="text-xs text-[#00FFA3]/60 mt-1 uppercase tracking-wider font-bold">Wins</p>
            </Card>

            <Card className="bg-[#0d1520] border border-red-400/15 rounded-xl p-5 text-center" data-testid="stat-losses">
              <div className="w-10 h-10 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <span className="font-mono font-black text-3xl text-red-400">{stats.losses}</span>
              <p className="text-xs text-red-400/60 mt-1 uppercase tracking-wider font-bold">Losses</p>
            </Card>

            <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5 text-center" data-testid="stat-win-rate">
              <div className="w-10 h-10 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
                <Percent className="w-5 h-5 text-[#00FFA3]" />
              </div>
              <span className="font-mono font-black text-3xl text-white">{stats.winRate}%</span>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">Win Rate</p>
            </Card>
          </div>

          {sortedDates.length === 0 ? (
            <Card className="bg-[#0d1520] border border-white/10 rounded-xl p-12 text-center">
              <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold text-white mb-2">No Pick History</h3>
              <p className="text-sm text-white/50">Past daily picks will appear here once available.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => {
                const picks = data![date];
                return (
                  <div key={date} data-testid={`date-group-${date}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00FFA3]" />
                      <h2 className="text-sm font-display font-bold text-white/70 uppercase tracking-wider" data-testid={`date-header-${date}`}>
                        {date}
                      </h2>
                      <span className="text-xs text-white/30 font-mono">{picks.length} picks</span>
                    </div>
                    <div className="space-y-2">
                      {picks.map((pick, i) => {
                        const isHigh = pick.confidence === "High";
                        const isMid = pick.confidence === "Mid";
                        const confColor = isHigh ? "#00FFA3" : isMid ? "#FFB800" : "#EF4444";

                        return (
                          <Card
                            key={pick.id ?? `${date}-${i}`}
                            className="bg-[#0d1520] border border-white/5 rounded-lg p-4"
                            data-testid={`pick-card-${pick.id ?? `${date}-${i}`}`}
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white mb-1">{pick.pick}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{pick.pickType}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] gap-1"
                                    style={{ borderColor: `${confColor}40`, color: confColor }}
                                  >
                                    {pick.confidence}
                                  </Badge>
                                </div>
                                {pick.homeTeam && pick.awayTeam && (
                                  <p className="text-xs text-white/40 mt-1.5">
                                    <span className="text-white/60">{pick.homeTeam}</span>
                                    <span className="text-white/30"> vs </span>
                                    <span className="text-white/60">{pick.awayTeam}</span>
                                    {pick.competition && (
                                      <span className="text-white/30"> · {pick.competition}</span>
                                    )}
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                <ResultBadge result={pick.result} />
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
