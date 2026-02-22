import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MatchCard } from "@/components/match-card";
import { StatsOverview } from "@/components/stats-overview";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Zap, Target, Calendar, Filter, ChevronLeft, ChevronRight, Radio, HelpCircle } from "lucide-react";
import type { MatchPrediction } from "@shared/schema";

function dateToLocalKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateKey(dateStr: string) {
  return dateToLocalKey(new Date(dateStr));
}

function getLocalTodayKey(): string {
  return dateToLocalKey(new Date());
}

function getDayLabel(dateKey: string) {
  const d = new Date(dateKey + "T12:00:00");
  const today = new Date();
  const todayKey = getLocalTodayKey();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = dateToLocalKey(tomorrow);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = dateToLocalKey(yesterday);

  if (dateKey === todayKey) return { label: "Today", sub: "" };
  if (dateKey === tomorrowKey) return { label: "Tomorrow", sub: "" };
  if (dateKey === yesterdayKey) return { label: "Yesterday", sub: "" };
  return {
    label: d.toLocaleDateString("en-US", { weekday: "short" }),
    sub: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function generateDateRange(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = -2; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(dateToLocalKey(d));
  }
  return dates;
}

export default function Dashboard() {
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | "all">("all");
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  const dateStrip = useMemo(() => generateDateRange(), []);
  const todayKey = getLocalTodayKey();

  const apiRange = useMemo(() => {
    return {
      from: dateStrip[0],
      to: dateStrip[dateStrip.length - 1],
    };
  }, [dateStrip]);

  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = todayRef.current;
      container.scrollLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
    }
  }, []);

  const { data: predictions, isLoading } = useQuery<MatchPrediction[]>({
    queryKey: ["/api/predictions", apiRange.from, apiRange.to],
    queryFn: async () => {
      const res = await fetch(`/api/predictions?dateFrom=${apiRange.from}&dateTo=${apiRange.to}`);
      if (!res.ok) throw new Error("Failed to fetch predictions");
      return res.json();
    },
  });

  const liveCount = useMemo(() => {
    if (!predictions) return 0;
    return predictions.filter(p => p.status === "IN_PLAY").length;
  }, [predictions]);

  const matchCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    if (predictions) {
      predictions.forEach(p => {
        const key = formatDateKey(p.matchDate);
        counts[key] = (counts[key] || 0) + 1;
      });
    }
    return counts;
  }, [predictions]);

  const leagues = useMemo(() => {
    if (!predictions) return [];
    const seen: string[] = [];
    const relevantPreds = selectedDate === "all" ? predictions : predictions.filter(p => formatDateKey(p.matchDate) === selectedDate);
    relevantPreds.forEach(p => {
      if (!seen.includes(p.competition)) seen.push(p.competition);
    });
    return seen.sort();
  }, [predictions, selectedDate]);

  const filteredPredictions = useMemo(() => {
    if (!predictions) return [];
    let filtered = predictions;
    if (selectedDate !== "all") {
      filtered = filtered.filter(p => formatDateKey(p.matchDate) === selectedDate);
    }
    if (showLiveOnly) {
      filtered = filtered.filter(p => p.status === "IN_PLAY");
    }
    if (selectedLeague !== "all") {
      filtered = filtered.filter(p => p.competition === selectedLeague);
    }
    return filtered;
  }, [predictions, selectedDate, selectedLeague, showLiveOnly]);

  const groupedByDate = useMemo(() => {
    const statusOrder = (status: string) => {
      if (status === "IN_PLAY" || status === "PAUSED" || status === "HALFTIME") return 0;
      if (status === "TIMED" || status === "SCHEDULED") return 1;
      return 2;
    };
    const groups: Record<string, MatchPrediction[]> = {};
    filteredPredictions.forEach(p => {
      const key = formatDateKey(p.matchDate);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const sa = statusOrder(a.status);
        const sb = statusOrder(b.status);
        if (sa !== sb) return sa - sb;
        return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
      });
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPredictions]);

  const scrollDates = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5 animate-fadeIn">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white" data-testid="text-dashboard-title">
            Match Predictions
          </h1>
          <p className="text-sm text-white/60 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {selectedDate === "all" ? "All upcoming matches" : getDayLabel(selectedDate).label || selectedDate}
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-white/30" />
              </TooltipTrigger>
              <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[240px]">
                <p className="text-xs">Pick a day from the date strip below to browse matches. Each card shows our AI's top 3 picks. Tap any match for full analysis!</p>
              </TooltipContent>
            </Tooltip>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              showLiveOnly
                ? "bg-[#00FFA3] text-black border-[#00FFA3] shadow-lg shadow-[#00FFA3]/20"
                : "bg-transparent text-[#00FFA3] border-[#00FFA3]/40 hover:bg-[#00FFA3]/10"
            }`}
            onClick={() => setShowLiveOnly(!showLiveOnly)}
            data-testid="button-live-filter"
          >
            <Radio className={`w-3 h-3 ${showLiveOnly ? "" : "animate-pulse"}`} />
            LIVE
            {liveCount > 0 && (
              <Badge className={`text-[10px] px-1 py-0 font-bold ${showLiveOnly ? "bg-black text-[#00FFA3]" : "bg-[#00FFA3] text-black"}`}>
                {liveCount}
              </Badge>
            )}
          </button>
          <Badge variant="outline" className="gap-1.5 border-white/20 text-white">
            <TrendingUp className="w-3 h-3" />
            {filteredPredictions.length} Matches
          </Badge>
        </div>
      </div>

      <div className="relative" data-testid="date-strip-container">
        <button
          onClick={() => scrollDates("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center bg-gradient-to-r from-background to-transparent"
          data-testid="button-date-scroll-left"
        >
          <ChevronLeft className="w-4 h-4 text-white/60" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide px-8 py-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <button
            onClick={() => { setSelectedDate("all"); setSelectedLeague("all"); }}
            className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedDate === "all"
                ? "bg-[#00FFA3] text-black border-[#00FFA3] shadow-lg shadow-[#00FFA3]/20"
                : "bg-white/[0.03] text-white/60 border-white/10 hover:border-[#00FFA3]/30 hover:text-white"
            }`}
            data-testid="button-date-all"
          >
            <span className="text-[11px] font-bold">All</span>
            <span className="text-[9px] opacity-60 mt-0.5">{predictions?.length || 0}</span>
          </button>
          {dateStrip.map(dateKey => {
            const { label, sub } = getDayLabel(dateKey);
            const count = matchCountByDate[dateKey] || 0;
            const isToday = dateKey === todayKey;
            const isSelected = selectedDate === dateKey;
            return (
              <button
                key={dateKey}
                ref={isToday ? todayRef : undefined}
                onClick={() => { setSelectedDate(dateKey); setSelectedLeague("all"); }}
                className={`flex-shrink-0 flex flex-col items-center min-w-[56px] px-2.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isSelected
                    ? "bg-[#00FFA3] text-black border-[#00FFA3] shadow-lg shadow-[#00FFA3]/20"
                    : isToday
                    ? "bg-[#00FFA3]/10 text-[#00FFA3] border-[#00FFA3]/30 hover:bg-[#00FFA3]/20"
                    : count > 0
                    ? "bg-white/[0.03] text-white/70 border-white/10 hover:border-[#00FFA3]/30 hover:text-white"
                    : "bg-white/[0.01] text-white/30 border-white/5"
                }`}
                data-testid={`button-date-${dateKey}`}
              >
                <span className="text-[11px] font-bold">{label}</span>
                {sub && <span className="text-[9px] opacity-60">{sub}</span>}
                {count > 0 && (
                  <span className={`text-[8px] mt-0.5 px-1.5 py-0 rounded-full font-mono ${
                    isSelected ? "bg-black/20 text-black" : "bg-white/5 text-white/40"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => scrollDates("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center bg-gradient-to-l from-background to-transparent"
          data-testid="button-date-scroll-right"
        >
          <ChevronRight className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <StatsOverview predictions={predictions} />

      {leagues.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-white/60 mr-1">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">League</span>
          </div>
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedLeague === "all"
                ? "bg-[#00FFA3] text-black border-[#00FFA3]"
                : "bg-transparent text-white border-white/20 hover:border-[#00FFA3]/50 hover:text-[#00FFA3]"
            }`}
            onClick={() => setSelectedLeague("all")}
            data-testid="filter-league-all"
          >
            All
          </button>
          {leagues.map(league => (
            <button
              key={league}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                selectedLeague === league
                  ? "bg-[#00FFA3] text-black border-[#00FFA3]"
                  : "bg-transparent text-white border-white/20 hover:border-[#00FFA3]/50 hover:text-[#00FFA3]"
              }`}
              onClick={() => setSelectedLeague(league)}
              data-testid={`filter-league-${league.replace(/\s+/g, '-').toLowerCase()}`}
            >
              {league}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-[#0d1520] border border-white/5 rounded-xl h-[340px]">
                  <div className="h-10 bg-white/[0.02] border-b border-white/5 rounded-t-xl" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/5" />
                      <div className="h-4 bg-white/5 rounded w-32" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/5" />
                      <div className="h-4 bg-white/5 rounded w-28" />
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full" />
                    <div className="space-y-2 mt-4">
                      <div className="h-12 bg-white/[0.02] rounded-lg" />
                      <div className="h-12 bg-white/[0.02] rounded-lg" />
                      <div className="h-12 bg-white/[0.02] rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : showLiveOnly && filteredPredictions.length === 0 ? (
          <div className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-12 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-4">
              <Radio className="w-8 h-8 text-[#00FFA3]/40" />
            </div>
            <h3 className="text-lg font-display font-semibold text-white mb-2">No Live Matches Right Now</h3>
            <p className="text-sm text-white/50 max-w-md mx-auto">
              No matches are currently being played. Check back during match times or browse upcoming fixtures.
            </p>
            <button
              onClick={() => setShowLiveOnly(false)}
              className="mt-5 px-5 py-2.5 rounded-full text-xs font-bold bg-[#00FFA3]/10 text-[#00FFA3] border border-[#00FFA3]/20 hover:bg-[#00FFA3]/20 transition-all hover:scale-105"
              data-testid="button-show-all-matches"
            >
              Show All Matches
            </button>
          </div>
        ) : groupedByDate.length > 0 ? (
          groupedByDate.map(([dateKey, matches]) => (
            <div key={dateKey} className="animate-fadeIn">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-4 h-4 text-[#00FFA3]" />
                <h2 className="text-base font-display font-bold text-white" data-testid={`date-group-${dateKey}`}>
                  {getDayLabel(dateKey).label}
                  {getDayLabel(dateKey).sub && <span className="text-white/40 font-normal ml-2 text-sm">{getDayLabel(dateKey).sub}</span>}
                </h2>
                <span className="text-xs text-white/40 font-mono">{matches.length} matches</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {matches.map((prediction, i) => (
                  <div key={prediction.matchId} className="animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
                    <MatchCard prediction={prediction} />
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[#0d1520] border border-white/10 rounded-xl p-12 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-lg font-display font-semibold text-white mb-2">No Matches Available</h3>
            <p className="text-sm text-white/50 max-w-md mx-auto">
              {selectedLeague !== "all"
                ? `No matches found for ${selectedLeague}. Try selecting a different league or date.`
                : selectedDate !== "all"
                ? "No matches scheduled for this day. Try a different date from the strip above."
                : "No matches scheduled for this period. Check back soon!"}
            </p>
            {selectedDate !== "all" && (
              <button
                onClick={() => setSelectedDate("all")}
                className="mt-5 px-5 py-2.5 rounded-full text-xs font-bold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-all"
                data-testid="button-show-all-dates"
              >
                Show All Dates
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
