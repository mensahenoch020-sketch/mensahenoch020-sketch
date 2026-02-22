import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Trophy, Crown, Medal, Target, TrendingUp, Flame } from "lucide-react";

interface LeaderboardEntry {
  id: number;
  username: string;
  profileImage: string;
  totalPicks: number;
  correctPicks: number;
  accuracy: number;
  totalStaked: string;
  totalReturns: string;
  roi: number;
  winStreak: number;
  updatedAt: string;
}

const PODIUM_COLORS = [
  { border: "#FFD700", bg: "rgba(255, 215, 0, 0.08)", text: "#FFD700", label: "1st" },
  { border: "#C0C0C0", bg: "rgba(192, 192, 192, 0.08)", text: "#C0C0C0", label: "2nd" },
  { border: "#CD7F32", bg: "rgba(205, 127, 50, 0.08)", text: "#CD7F32", label: "3rd" },
];

function PodiumIcon({ position }: { position: number }) {
  if (position === 0) return <Crown className="w-6 h-6" style={{ color: "#FFD700" }} />;
  if (position === 1) return <Medal className="w-6 h-6" style={{ color: "#C0C0C0" }} />;
  return <Medal className="w-6 h-6" style={{ color: "#CD7F32" }} />;
}

function PodiumCard({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  const colors = PODIUM_COLORS[position];
  const initial = entry.username?.charAt(0)?.toUpperCase() || "?";

  return (
    <Card
      className="bg-[#0d1520] rounded-xl p-6 text-center relative overflow-visible"
      style={{ border: `1px solid ${colors.border}30` }}
      data-testid={`podium-card-${position}`}
    >
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black font-mono"
        style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}`, color: colors.text }}
      >
        {position + 1}
      </div>

      <div className="mt-4 mb-3 flex justify-center">
        <PodiumIcon position={position} />
      </div>

      <Avatar className="w-16 h-16 mx-auto mb-3" style={{ border: `2px solid ${colors.border}40` }}>
        {entry.profileImage ? (
          <AvatarImage src={entry.profileImage} alt={entry.username} />
        ) : null}
        <AvatarFallback
          className="text-lg font-bold"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {initial}
        </AvatarFallback>
      </Avatar>

      <h3 className="font-display font-bold text-white text-base truncate" data-testid={`text-username-${entry.id}`}>
        {entry.username}
      </h3>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Target className="w-3.5 h-3.5 text-[#00FFA3]" />
          <span className="font-mono font-black text-xl" style={{ color: colors.text }}>
            {entry.accuracy.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-[#00FFA3]" />
          <span className="font-mono font-bold text-sm text-white/70">
            ROI {entry.roi >= 0 ? "+" : ""}{entry.roi.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          {entry.winStreak > 0 && (
            <Badge className="no-default-hover-elevate no-default-active-elevate text-[10px] font-bold" style={{ backgroundColor: `${colors.border}20`, color: colors.text, border: `1px solid ${colors.border}30` }}>
              <Flame className="w-3 h-3 mr-1" />
              {entry.winStreak}W
            </Badge>
          )}
          <span className="text-[10px] text-white/30 font-mono">{entry.totalPicks} picks</span>
        </div>
      </div>
    </Card>
  );
}

function LeaderboardRow({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  const initial = entry.username?.charAt(0)?.toUpperCase() || "?";

  return (
    <Card
      className="bg-[#0d1520] border border-white/5 rounded-xl p-4"
      data-testid={`leaderboard-row-${position}`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-mono font-bold text-white/30 w-6 text-center shrink-0">
          {position + 1}
        </span>

        <Avatar className="w-10 h-10 shrink-0">
          {entry.profileImage ? (
            <AvatarImage src={entry.profileImage} alt={entry.username} />
          ) : null}
          <AvatarFallback className="text-sm font-bold bg-white/5 text-white/60">
            {initial}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-white text-sm truncate" data-testid={`text-username-${entry.id}`}>
            {entry.username}
          </p>
          <p className="text-[10px] text-white/30 font-mono">{entry.totalPicks} picks</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {entry.winStreak > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-mono font-bold text-xs text-orange-400">{entry.winStreak}</span>
            </div>
          )}

          <div className="text-right">
            <p className="font-mono font-black text-sm text-[#00FFA3]">{entry.accuracy.toFixed(1)}%</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Accuracy</p>
          </div>

          <div className="text-right">
            <p className={`font-mono font-bold text-sm ${entry.roi >= 0 ? "text-[#00FFA3]" : "text-red-400"}`}>
              {entry.roi >= 0 ? "+" : ""}{entry.roi.toFixed(1)}%
            </p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">ROI</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const leaderboard = entries || [];
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60" data-testid="button-back-leaderboard">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[#00FFA3]" />
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white" data-testid="text-leaderboard-title">
              Leaderboard
            </h1>
            <p className="text-sm text-white/50 mt-0.5">Top predictors ranked by accuracy & ROI</p>
          </div>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <Card className="bg-[#0d1520] border border-white/10 rounded-xl p-12 text-center" data-testid="empty-leaderboard">
          <Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-white mb-2">No entries yet</h3>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Once users start making picks, the top predictors will appear here ranked by their accuracy and returns.
          </p>
        </Card>
      ) : (
        <>
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="podium-section">
              {topThree.map((entry, i) => (
                <PodiumCard key={entry.id} entry={entry} position={i} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-3" data-testid="leaderboard-list">
              {rest.map((entry, i) => (
                <LeaderboardRow key={entry.id} entry={entry} position={i + 3} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
