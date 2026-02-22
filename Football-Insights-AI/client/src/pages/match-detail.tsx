import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, TrendingUp, Target, BarChart3, Zap, Plus, Check, HelpCircle, Shield, Swords, Clock, CircleDot, AlertTriangle, ArrowRightLeft, History, Heart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchPrediction } from "@shared/schema";
import { useBetSlip } from "@/lib/bet-slip-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const marketExplanations: Record<string, string> = {
  "1X2": "Who wins? Home team (1), Draw (X), or Away team (2)",
  "Double Chance": "Two outcomes covered — safer bet with lower odds",
  "BTTS (GG/NG)": "Will both teams score at least one goal?",
  "Over/Under 2.5": "Will there be 3 or more goals (Over) or 2 or fewer (Under)?",
  "Over/Under 1.5": "Will there be 2+ goals (Over) or 0-1 goals (Under)?",
  "Over/Under 3.5": "Will there be 4+ goals (Over) or 3 or fewer (Under)?",
  "Over/Under 4.5": "Will there be 5+ goals? Very rare in most matches",
  "Correct Score": "Predict the exact final score — hardest but highest paying",
  "Asian Handicap -0.5": "Team must win (no draw option). Like 1X2 but simpler",
  "Asian Handicap -1.5": "Team must win by 2+ goals. Higher risk, higher reward",
  "HT/FT": "Who leads at halftime AND who wins at full time",
  "Halftime Result": "Who will be leading at halftime?",
  "1X2 + Over/Under 2.5": "Combo bet: who wins AND how many goals",
  "1X2 + BTTS": "Combo bet: who wins AND will both teams score?",
};

function AnimatedConfidenceMeter({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: { r: 14, s: 2.5 }, md: { r: 20, s: 3 }, lg: { r: 28, s: 4 } };
  const { r: radius, s: stroke } = sizes[size];
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 60 ? "#00FFA3" : value >= 40 ? "#FFB800" : "#EF4444";
  const dim = (radius + stroke) * 2;
  const fontSize = size === "lg" ? "text-sm" : size === "md" ? "text-[10px]" : "text-[9px]";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <span className={`absolute font-mono font-black ${fontSize}`} style={{ color }}>{value}%</span>
    </div>
  );
}

function ComparisonBar({ label, homeValue, awayValue, homeLabel, awayLabel }: { label: string; homeValue: number; awayValue: number; homeLabel?: string; awayLabel?: string }) {
  const total = homeValue + awayValue || 1;
  const homePercent = (homeValue / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[#00FFA3] font-mono font-bold">{homeLabel || homeValue}</span>
        <span className="text-white/40 uppercase tracking-wider font-bold">{label}</span>
        <span className="text-white/60 font-mono font-bold">{awayLabel || awayValue}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
        <div className="bg-[#00FFA3] rounded-l-full transition-all duration-700" style={{ width: `${homePercent}%` }} />
        <div className="bg-white/40 rounded-r-full transition-all duration-700" style={{ width: `${100 - homePercent}%` }} />
      </div>
    </div>
  );
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 60) return "text-[#00FFA3]";
  if (confidence >= 40) return "text-amber-400";
  return "text-red-400";
}

function getConfidenceBg(confidence: number) {
  if (confidence >= 60) return "bg-[#00FFA3]/5 border-[#00FFA3]/15";
  if (confidence >= 40) return "bg-amber-400/5 border-amber-400/15";
  return "bg-red-400/5 border-red-400/15";
}

function getConfidenceLabel(c: number) {
  if (c >= 70) return "Very Strong";
  if (c >= 60) return "Strong";
  if (c >= 45) return "Moderate";
  if (c >= 30) return "Risky";
  return "Long Shot";
}

function FormBadge({ result }: { result: string }) {
  const styles: Record<string, string> = {
    W: "bg-[#00FFA3]/20 text-[#00FFA3] border-[#00FFA3]/30",
    D: "bg-amber-400/20 text-amber-400 border-amber-400/30",
    L: "bg-red-400/20 text-red-400 border-red-400/30",
  };
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold border ${styles[result] || styles.D}`}>
      {result}
    </span>
  );
}

function OddsComparison({ matchId }: { matchId: number }) {
  const { data: odds, isLoading } = useQuery<any[]>({
    queryKey: ["/api/predictions", matchId, "odds"],
    queryFn: async () => {
      const res = await fetch(`/api/predictions/${matchId}/odds`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (!odds || odds.length === 0) return null;

  return (
    <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5" data-testid="section-odds-comparison">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-[#00FFA3]" />
        <h3 className="font-display font-bold text-white">Odds Comparison</h3>
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="w-4 h-4 text-white/20" />
          </TooltipTrigger>
          <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[260px]">
            <p className="text-xs">Compare odds from different bookmakers. Higher odds mean bigger potential payouts. The best available odds are highlighted in green.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-3">
        {odds.map((item, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-3" data-testid={`odds-row-${i}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/60">{item.market}</span>
              <Badge variant="outline" className="text-[10px] border-[#00FFA3]/30 text-[#00FFA3]">{item.pick}</Badge>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {item.allOdds.map((o: any, j: number) => (
                <div key={j} className={`flex-shrink-0 text-center px-3 py-1.5 rounded-md ${j === 0 ? "bg-[#00FFA3]/10 border border-[#00FFA3]/30" : "bg-white/[0.02] border border-white/5"}`}>
                  <p className={`text-xs font-mono font-bold ${j === 0 ? "text-[#00FFA3]" : "text-white/60"}`}>{o.odds}</p>
                  <p className="text-[9px] text-white/30 truncate max-w-[60px]">{o.bookmaker}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FormGuide({ teamId, teamName }: { teamId: number; teamName: string }) {
  const { data: form, isLoading } = useQuery<{ result: string; opponent: string; score: string; date: string; competition: string }[]>({
    queryKey: ["/api/teams", teamId, "form"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/form`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: teamId > 0,
  });

  if (isLoading) return <div className="flex gap-1">{[...Array(5)].map((_, i) => <Skeleton key={i} className="w-7 h-7 rounded-md" />)}</div>;
  if (!form || form.length === 0) return <span className="text-[10px] text-white/30">No recent form</span>;

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{teamName} Form</span>
      </div>
      <div className="flex gap-1">
        {form.map((f, i) => (
          <Tooltip key={i}>
            <TooltipTrigger>
              <FormBadge result={f.result} />
            </TooltipTrigger>
            <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white">
              <p className="text-[11px] font-bold">{f.score} vs {f.opponent}</p>
              <p className="text-[10px] text-white/50">{f.competition}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function HeadToHead({ matchId, homeTeam, awayTeam }: { matchId: number; homeTeam: string; awayTeam: string }) {
  const { data, isLoading } = useQuery<{ matches: any[]; aggregates: any }>({
    queryKey: ["/api/matches", matchId, "h2h"],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${matchId}/h2h`);
      if (!res.ok) return { matches: [] };
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-40 rounded-lg" />;
  if (!data?.matches?.length) return null;

  return (
    <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-[#00FFA3]" />
        <h3 className="font-display font-bold text-white">Head-to-Head</h3>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="w-4 h-4 text-white/20" /></TooltipTrigger>
          <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[240px]">
            <p className="text-xs">Recent past meetings between these two teams. Look for patterns in results and scorelines!</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {data.aggregates && (
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="text-center">
            <p className="text-lg font-mono font-bold text-[#00FFA3]">{data.aggregates.homeTeam?.wins || 0}</p>
            <p className="text-[10px] text-white/40">{homeTeam} Wins</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-mono font-bold text-amber-400">{data.aggregates.homeTeam?.draws || 0}</p>
            <p className="text-[10px] text-white/40">Draws</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-mono font-bold text-white/60">{data.aggregates.awayTeam?.wins || 0}</p>
            <p className="text-[10px] text-white/40">{awayTeam} Wins</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {data.matches.slice(0, 5).map((m: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">{m.homeTeam}</span>
                <span className="text-sm font-mono font-black text-white">{m.homeScore ?? "-"} - {m.awayScore ?? "-"}</span>
                <span className="text-xs font-bold text-white truncate">{m.awayTeam}</span>
              </div>
              <p className="text-[10px] text-white/30 mt-0.5">
                {m.competition} · {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MatchTimeline({ matchId, status }: { matchId: number; status: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/matches", matchId, "details"],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${matchId}/details`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: status === "FINISHED" || status === "IN_PLAY",
  });

  if (isLoading) return <Skeleton className="h-40 rounded-lg" />;
  if (!data) return null;

  const events: { minute: number; type: string; team: string; player: string; detail?: string }[] = [];

  if (data.goals) {
    for (const g of data.goals) {
      events.push({
        minute: g.minute || 0,
        type: "goal",
        team: g.team?.name || "",
        player: g.scorer?.name || "Unknown",
        detail: g.assist?.name ? `Assist: ${g.assist.name}` : undefined,
      });
    }
  }

  if (data.bookings) {
    for (const b of data.bookings) {
      events.push({
        minute: b.minute || 0,
        type: b.card === "RED" ? "red_card" : "yellow_card",
        team: b.team?.name || "",
        player: b.player?.name || "Unknown",
      });
    }
  }

  if (data.substitutions) {
    for (const s of data.substitutions) {
      events.push({
        minute: s.minute || 0,
        type: "substitution",
        team: s.team?.name || "",
        player: s.playerIn?.name || "Unknown",
        detail: s.playerOut?.name ? `Out: ${s.playerOut.name}` : undefined,
      });
    }
  }

  events.sort((a, b) => a.minute - b.minute);

  if (events.length === 0) return null;

  const eventIcon = (type: string) => {
    switch (type) {
      case "goal": return <CircleDot className="w-4 h-4 text-[#00FFA3]" />;
      case "yellow_card": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "red_card": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "substitution": return <ArrowRightLeft className="w-4 h-4 text-blue-400" />;
      default: return <Clock className="w-4 h-4 text-white/40" />;
    }
  };

  return (
    <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-[#00FFA3]" />
        <h3 className="font-display font-bold text-white">Match Timeline</h3>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="w-4 h-4 text-white/20" /></TooltipTrigger>
          <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[240px]">
            <p className="text-xs">Key match events: goals, cards, and substitutions in chronological order.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-1">
        {events.map((event, i) => (
          <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-mono font-bold text-white/50 w-8 text-right">{event.minute}'</span>
              {eventIcon(event.type)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">{event.player}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40">{event.team}</span>
                {event.detail && <span className="text-[10px] text-white/30">· {event.detail}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function MatchDetail() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;
  const { addItem, isInSlip } = useBetSlip();
  const { toast } = useToast();

  const { data: prediction, isLoading } = useQuery<MatchPrediction>({
    queryKey: ["/api/predictions", matchId],
  });

  const { data: favorites } = useQuery<{ id: number; teamId: number; teamName: string }[]>({
    queryKey: ["/api/favorites"],
  });

  const addFavMutation = useMutation({
    mutationFn: async (data: { teamId: number; teamName: string; teamCrest: string }) => {
      const res = await apiRequest("POST", "/api/favorites", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: "Team added to favorites!" });
    },
  });

  const removeFavMutation = useMutation({
    mutationFn: async (teamId: number) => {
      await apiRequest("DELETE", `/api/favorites/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: "Team removed from favorites" });
    },
  });

  const isTeamFavorite = (teamId: number) => favorites?.some(f => f.teamId === teamId) || false;

  const toggleFavorite = (teamId: number, teamName: string, teamCrest: string) => {
    if (isTeamFavorite(teamId)) {
      removeFavMutation.mutate(teamId);
    } else {
      addFavMutation.mutate({ teamId, teamName, teamCrest });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] rounded-lg" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="p-6 text-center">
        <p className="text-white/60">Match not found</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const matchDate = new Date(prediction.matchDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleAddToSlip = (market: typeof prediction.markets[0]) => {
    addItem({
      matchId: prediction.matchId,
      homeTeam: prediction.homeTeam,
      awayTeam: prediction.awayTeam,
      competition: prediction.competition,
      market,
    });
  };

  const top3 = prediction.markets.slice(0, 3);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-white" data-testid="text-match-title">
            {prediction.homeTeam} vs {prediction.awayTeam}
          </h1>
          <p className="text-sm text-white/50">{prediction.competition} · {matchDate}</p>
        </div>
      </div>

      <div className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center">
            {prediction.homeCrest ? (
              <img src={prediction.homeCrest} alt="" className="w-16 h-16 object-contain mx-auto mb-3 transition-transform hover:scale-110" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-[#00FFA3]">{prediction.homeTeam.charAt(0)}</span>
              </div>
            )}
            <h3 className="text-lg font-display font-bold text-white" data-testid="text-home-team">{prediction.homeTeam}</h3>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <p className="text-xs text-white/40">Home</p>
              <button
                onClick={() => toggleFavorite(prediction.homeTeamId, prediction.homeTeam, prediction.homeCrest)}
                className="transition-colors"
                data-testid="button-fav-home"
              >
                <Heart className={`w-3.5 h-3.5 ${isTeamFavorite(prediction.homeTeamId) ? "fill-red-400 text-red-400" : "text-white/20 hover:text-red-400"}`} />
              </button>
            </div>
          </div>

          <div className="text-center space-y-3">
            {prediction.score && prediction.score.fullTime.home !== null && prediction.score.fullTime.away !== null ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <span className={`text-4xl font-mono font-black ${prediction.status === "IN_PLAY" ? "text-[#00FFA3]" : "text-white"}`} data-testid="score-detail-home">
                    {prediction.score.fullTime.home}
                  </span>
                  <span className="text-xl text-white/30 font-bold">-</span>
                  <span className={`text-4xl font-mono font-black ${prediction.status === "IN_PLAY" ? "text-[#00FFA3]" : "text-white"}`} data-testid="score-detail-away">
                    {prediction.score.fullTime.away}
                  </span>
                </div>
                {prediction.score.halfTime.home !== null && (
                  <p className="text-[10px] text-white/30 font-mono">
                    HT: {prediction.score.halfTime.home} - {prediction.score.halfTime.away}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-mono font-black text-[#00FFA3]">{prediction.homeWinProb}%</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Home</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-mono font-black text-amber-400">{prediction.drawProb}%</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Draw</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-mono font-black text-white/70">{prediction.awayWinProb}%</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Away</p>
                </div>
              </div>
            )}
            <Badge className={`${prediction.status === "IN_PLAY" ? "bg-[#00FFA3] text-black animate-pulse" : prediction.status === "FINISHED" ? "bg-white/10 text-white/60 border-white/20" : "bg-white/10 text-white/60 border-white/20"}`}>
              {prediction.status === "IN_PLAY" ? "LIVE" : prediction.status === "FINISHED" ? "Full Time" : prediction.status}
            </Badge>
          </div>

          <div className="flex-1 text-center">
            {prediction.awayCrest ? (
              <img src={prediction.awayCrest} alt="" className="w-16 h-16 object-contain mx-auto mb-3 transition-transform hover:scale-110" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-white/60">{prediction.awayTeam.charAt(0)}</span>
              </div>
            )}
            <h3 className="text-lg font-display font-bold text-white" data-testid="text-away-team">{prediction.awayTeam}</h3>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <p className="text-xs text-white/40">Away</p>
              <button
                onClick={() => toggleFavorite(prediction.awayTeamId, prediction.awayTeam, prediction.awayCrest)}
                className="transition-colors"
                data-testid="button-fav-away"
              >
                <Heart className={`w-3.5 h-3.5 ${isTeamFavorite(prediction.awayTeamId) ? "fill-red-400 text-red-400" : "text-white/20 hover:text-red-400"}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40 uppercase tracking-wider font-bold">Win Probability</span>
            <Badge variant="outline" className={`text-[10px] font-bold ${
              prediction.overallConfidence === "High" ? "border-[#00FFA3]/30 text-[#00FFA3]" :
              prediction.overallConfidence === "Mid" ? "border-amber-400/30 text-amber-400" :
              "border-red-400/30 text-red-400"
            }`}>
              {prediction.overallConfidence === "High" ? "High Confidence" : prediction.overallConfidence === "Mid" ? "Moderate" : "Risky"}
            </Badge>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            <div className="bg-[#00FFA3] rounded-l-full transition-all duration-700" style={{ width: `${prediction.homeWinProb}%` }} />
            <div className="bg-amber-400 transition-all duration-700" style={{ width: `${prediction.drawProb}%` }} />
            <div className="bg-white/40 rounded-r-full transition-all duration-700" style={{ width: `${prediction.awayWinProb}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-white/30">
            <span>{prediction.homeTeam}</span>
            <span>Draw</span>
            <span>{prediction.awayTeam}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
          <FormGuide teamId={prediction.homeTeamId} teamName={prediction.homeTeam} />
          <FormGuide teamId={prediction.awayTeamId} teamName={prediction.awayTeam} />
        </div>
      </div>

      <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#00FFA3]" />
          <h3 className="font-display font-bold text-white">Our Top 3 Picks</h3>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-white/20" />
            </TooltipTrigger>
            <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[240px]">
              <p className="text-xs">These are our AI's 3 most confident predictions for this match. The circular meter shows confidence level — higher is better!</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {top3.map((market, i) => {
            const inSlip = isInSlip(prediction.matchId, market.market);
            return (
              <div key={i} className={`p-4 rounded-xl border ${getConfidenceBg(market.confidence)} text-center relative group transition-colors`} data-testid={`top-pick-${i}`}>
                <div className="flex justify-center mb-3">
                  <AnimatedConfidenceMeter value={market.confidence} size="lg" />
                </div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">{market.market}</p>
                <p className="text-base font-bold text-white mb-1">{market.pick}</p>
                <p className="text-[10px] text-white/30 mb-3">{getConfidenceLabel(market.confidence)}</p>
                <button
                  onClick={() => handleAddToSlip(market)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    inSlip ? "bg-[#00FFA3] text-black" : "bg-white/5 text-white/50 hover:bg-[#00FFA3]/20 hover:text-[#00FFA3]"
                  }`}
                  data-testid={`button-save-pick-${i}`}
                >
                  {inSlip ? <><Check className="w-3 h-3 inline mr-1" />Saved</> : <><Plus className="w-3 h-3 inline mr-1" />Save Pick</>}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Swords className="w-5 h-5 text-[#00FFA3]" />
            <h3 className="font-display font-bold text-white">Team Comparison</h3>
          </div>
          <div className="space-y-4">
            <ComparisonBar label="Win Chance" homeValue={prediction.homeWinProb} awayValue={prediction.awayWinProb} homeLabel={`${prediction.homeWinProb}%`} awayLabel={`${prediction.awayWinProb}%`} />
            <ComparisonBar label="Attack" homeValue={prediction.homeWinProb + 10} awayValue={prediction.awayWinProb + 10} homeLabel={`${Math.min(99, prediction.homeWinProb + 10)}`} awayLabel={`${Math.min(99, prediction.awayWinProb + 10)}`} />
            <ComparisonBar label="Defense" homeValue={100 - prediction.awayWinProb} awayValue={100 - prediction.homeWinProb} homeLabel={`${100 - prediction.awayWinProb}`} awayLabel={`${100 - prediction.homeWinProb}`} />
            <ComparisonBar label="Form" homeValue={prediction.homeWinProb + 5} awayValue={prediction.awayWinProb + 5} homeLabel={`${Math.min(99, prediction.homeWinProb + 5)}`} awayLabel={`${Math.min(99, prediction.awayWinProb + 5)}`} />
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-[10px] text-white/30">
            <span className="text-[#00FFA3] font-bold">{prediction.homeTeam}</span>
            <span className="font-bold">{prediction.awayTeam}</span>
          </div>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[#00FFA3]" />
            <h3 className="font-display font-bold text-white">AI Analysis</h3>
          </div>
          <div className="p-4 rounded-lg bg-[#00FFA3]/[0.04] border border-[#00FFA3]/10">
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap" data-testid="text-ai-summary">
              {prediction.aiSummary}
            </p>
          </div>
        </Card>
      </div>

      <OddsComparison matchId={prediction.matchId} />

      <HeadToHead matchId={prediction.matchId} homeTeam={prediction.homeTeam} awayTeam={prediction.awayTeam} />

      <MatchTimeline matchId={prediction.matchId} status={prediction.status} />

      <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#00FFA3]" />
          <h3 className="font-display font-bold text-white">All Prediction Markets</h3>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-white/20" />
            </TooltipTrigger>
            <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[260px]">
              <p className="text-xs">Each row is a different type of bet. The bar shows how confident we are. Tap the ? icons for explanations of each market type!</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-white/40 ml-auto font-mono">{prediction.markets.length} markets</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {prediction.markets.map((market, i) => {
            const inSlip = isInSlip(prediction.matchId, market.market);
            const explanation = marketExplanations[market.market];
            return (
              <div key={i} className={`p-3 rounded-lg border transition-colors ${getConfidenceBg(market.confidence)}`} data-testid={`market-row-${i}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{market.market}</span>
                    {explanation && (
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-3 h-3 text-white/15" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[200px]">
                          <p className="text-[11px]">{explanation}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <AnimatedConfidenceMeter value={market.confidence} size="sm" />
                    <button
                      onClick={() => handleAddToSlip(market)}
                      className={`p-1 rounded-md transition-all ${
                        inSlip ? "bg-[#00FFA3]/20 text-[#00FFA3]" : "bg-white/5 text-white/30 hover:bg-[#00FFA3]/10 hover:text-[#00FFA3]"
                      }`}
                      data-testid={`button-add-market-${i}`}
                    >
                      {inSlip ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{market.pick}</span>
                  {market.odds && (
                    <span className="text-xs text-white/40 font-mono">@ {market.odds}</span>
                  )}
                </div>
                <Progress value={market.confidence} className="h-1 mt-2" />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
