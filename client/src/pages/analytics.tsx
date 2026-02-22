import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Trophy, ArrowLeft, Search, Filter } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { StandingEntry } from "@shared/schema";

interface StandingsData {
  competition: string;
  emblem?: string;
  table: StandingEntry[];
}

export default function Analytics() {
  const { data: standings, isLoading } = useQuery<StandingsData[]>({
    queryKey: ["/api/standings"],
  });

  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStandings = useMemo(() => {
    if (!standings) return [];
    let filtered = standings;
    if (selectedLeague !== "all") {
      filtered = filtered.filter(s => s.competition === selectedLeague);
    }
    if (searchQuery.trim()) {
      filtered = filtered.map(league => ({
        ...league,
        table: league.table.filter(entry =>
          (entry.team.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (entry.team.shortName || "").toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(league => league.table.length > 0);
    }
    return filtered;
  }, [standings, selectedLeague, searchQuery]);

  const leagueNames = useMemo(() => {
    if (!standings) return [];
    return standings.map(s => s.competition);
  }, [standings]);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white md:hidden" data-testid="button-back-analytics">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white" data-testid="text-analytics-title">
            Analytics & Standings
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {standings ? `${standings.length} leagues` : "Loading leagues..."} — tables, stats, and team performance
          </p>
        </div>
      </div>

      <Tabs defaultValue="standings" className="w-full">
        <TabsList className="bg-[#0d1520] border border-white/10">
          <TabsTrigger value="standings" className="gap-1.5 data-[state=active]:bg-[#00FFA3]/10 data-[state=active]:text-[#00FFA3] text-white/60" data-testid="tab-standings">
            <Trophy className="w-3.5 h-3.5" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5 data-[state=active]:bg-[#00FFA3]/10 data-[state=active]:text-[#00FFA3] text-white/60" data-testid="tab-stats">
            <BarChart3 className="w-3.5 h-3.5" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1520] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00FFA3]/40 transition-colors"
                data-testid="input-search-teams"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-white/40" />
              <button
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedLeague === "all" ? "bg-[#00FFA3] text-black border-[#00FFA3]" : "bg-transparent text-white border-white/20 hover:border-[#00FFA3]/50"
                }`}
                onClick={() => setSelectedLeague("all")}
                data-testid="filter-standings-all"
              >
                All
              </button>
              {leagueNames.map(name => (
                <button
                  key={name}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    selectedLeague === name ? "bg-[#00FFA3] text-black border-[#00FFA3]" : "bg-transparent text-white border-white/20 hover:border-[#00FFA3]/50"
                  }`}
                  onClick={() => setSelectedLeague(name)}
                  data-testid={`filter-standings-${name.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[300px] rounded-lg" />
              ))}
            </div>
          ) : filteredStandings && filteredStandings.length > 0 ? (
            <div className="space-y-6">
              {filteredStandings.map((league, li) => (
                <Card key={li} className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl overflow-hidden" data-testid={`standings-card-${li}`}>
                  <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/[0.02]">
                    {league.emblem && (
                      <img src={league.emblem} alt="" className="w-6 h-6 object-contain" />
                    )}
                    <Trophy className="w-5 h-5 text-[#FFB800]" />
                    <h3 className="font-display font-bold text-white">{league.competition}</h3>
                    <Badge variant="outline" className="ml-auto border-white/10 text-white/40 text-[10px]">
                      {league.table.length} teams
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid={`table-standings-${li}`}>
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2.5 px-3 text-[10px] text-white/40 font-bold uppercase tracking-wider">#</th>
                          <th className="text-left py-2.5 px-3 text-[10px] text-white/40 font-bold uppercase tracking-wider">Team</th>
                          <th className="text-center py-2.5 px-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">P</th>
                          <th className="text-center py-2.5 px-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">W</th>
                          <th className="text-center py-2.5 px-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">D</th>
                          <th className="text-center py-2.5 px-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">L</th>
                          <th className="text-center py-2.5 px-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">GF</th>
                          <th className="text-center py-2.5 px-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">GA</th>
                          <th className="text-center py-2.5 px-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">GD</th>
                          <th className="text-center py-2.5 px-3 text-[10px] text-white/40 font-bold uppercase tracking-wider">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {league.table.map((entry, ei) => {
                          const formColors: Record<string, string> = { W: "bg-[#00FFA3]", D: "bg-amber-400", L: "bg-red-400" };
                          return (
                            <tr key={`${li}-${ei}-${entry.position}`} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.03]">
                              <td className="py-2.5 px-3">
                                <span className={`text-xs font-mono font-bold ${
                                  entry.position <= 4 ? "text-[#00FFA3]" :
                                  entry.position >= (league.table.length - 2) ? "text-red-400" :
                                  "text-white/50"
                                }`}>
                                  {entry.position}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  {entry.team.crest && (
                                    <img src={entry.team.crest} alt="" className="w-5 h-5 object-contain" />
                                  )}
                                  <span className="text-sm font-medium text-white truncate max-w-[150px]">
                                    {entry.team.shortName || entry.team.name}
                                  </span>
                                  {(entry as any).form && (
                                    <div className="hidden sm:flex items-center gap-0.5 ml-1">
                                      {((entry as any).form as string).split(",").slice(-5).map((r: string, fi: number) => (
                                        <div key={fi} className={`w-1.5 h-1.5 rounded-full ${formColors[r] || "bg-white/20"}`} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="text-center py-2.5 px-2 text-xs text-white/60 font-mono">{entry.playedGames}</td>
                              <td className="text-center py-2.5 px-2 text-xs text-[#00FFA3] font-mono font-bold">{entry.won}</td>
                              <td className="text-center py-2.5 px-2 text-xs text-[#FFB800] font-mono">{entry.draw}</td>
                              <td className="text-center py-2.5 px-2 text-xs text-red-400 font-mono">{entry.lost}</td>
                              <td className="text-center py-2.5 px-2 text-xs text-white/60 font-mono">{entry.goalsFor}</td>
                              <td className="text-center py-2.5 px-2 text-xs text-white/60 font-mono">{entry.goalsAgainst}</td>
                              <td className="text-center py-2.5 px-2 text-xs font-mono font-bold">
                                <span className={entry.goalDifference > 0 ? "text-[#00FFA3]" : entry.goalDifference < 0 ? "text-red-400" : "text-white/50"}>
                                  {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                                </span>
                              </td>
                              <td className="text-center py-2.5 px-3">
                                <span className="text-sm font-mono font-black text-white bg-white/5 px-2 py-0.5 rounded">{entry.points}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-[#0d1520] border border-white/10 rounded-xl p-12 text-center">
              <Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold text-white mb-2">No Standings Available</h3>
              <p className="text-sm text-white/50">League standings will appear here once data is loaded.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Most Goals Scored", icon: TrendingUp, color: "text-[#00FFA3]", bgColor: "bg-[#00FFA3]/5 border-[#00FFA3]/15" },
              { label: "Best Defense", icon: Users, color: "text-sky-400", bgColor: "bg-sky-400/5 border-sky-400/15" },
              { label: "Top Form", icon: BarChart3, color: "text-[#FFB800]", bgColor: "bg-[#FFB800]/5 border-[#FFB800]/15" },
            ].map((stat, i) => (
              <Card key={i} className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 rounded-lg ${stat.bgColor} border flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <h3 className="font-display font-bold text-white text-sm">{stat.label}</h3>
                </div>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, j) => <Skeleton key={j} className="h-8 rounded" />)}
                  </div>
                ) : standings && standings[0]?.table ? (
                  <div className="space-y-2">
                    {standings[0].table
                      .sort((a, b) => {
                        if (i === 0) return b.goalsFor - a.goalsFor;
                        if (i === 1) return a.goalsAgainst - b.goalsAgainst;
                        return b.points - a.points;
                      })
                      .slice(0, 5)
                      .map((entry, j) => (
                        <div key={j} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.06]">
                          <div className="flex items-center gap-2.5">
                            <span className={`text-xs font-mono font-bold w-5 text-center ${j === 0 ? stat.color : "text-white/40"}`}>{j + 1}</span>
                            {entry.team.crest && <img src={entry.team.crest} alt="" className="w-5 h-5 object-contain" />}
                            <span className="text-xs font-medium text-white truncate max-w-[120px]">{entry.team.shortName || entry.team.name}</span>
                          </div>
                          <span className={`text-sm font-mono font-bold ${stat.color}`}>
                            {i === 0 ? entry.goalsFor : i === 1 ? entry.goalsAgainst : entry.points}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
