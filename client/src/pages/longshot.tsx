import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Zap, TrendingUp, Calendar, Trophy, Target, Layers, Clock, ChevronRight, Download, Star, Loader2 } from "lucide-react";
import { useBetSlip } from "@/lib/bet-slip-context";
import { useToast } from "@/hooks/use-toast";

interface LongshotLeg {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeCrest: string;
  awayCrest: string;
  competition: string;
  competitionEmblem: string;
  matchDate: string;
  market: string;
  pick: string;
  confidence: number;
  odds: string;
}

interface LongshotAccumulator {
  legs: LongshotLeg[];
  combinedOdds: string;
  totalLegs: number;
  potentialReturn: string;
  generatedDate: string;
  daySpread: number;
  leagueCount: number;
}

function AnimatedConfidenceMeter({ value, color }: { value: number; color: string }) {
  const radius = 20;
  const stroke = 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const dim = (radius + stroke) * 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <span className="absolute text-[10px] font-mono font-black" style={{ color }}>{value}%</span>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawLongshotToCanvas(
  data: LongshotAccumulator,
  groupedByDate: Record<string, LongshotLeg[]>,
  sortedDates: string[]
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const scale = 2;
  const width = 400;
  const padding = 20;
  const contentWidth = width - padding * 2;

  let totalHeight = padding;
  totalHeight += 50;
  totalHeight += 80;
  totalHeight += 16;

  for (const dateKey of sortedDates) {
    totalHeight += 28;
    totalHeight += groupedByDate[dateKey].length * 48;
    totalHeight += 12;
  }

  totalHeight += 40;
  totalHeight += padding;

  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#0a0e27";
  ctx.fillRect(0, 0, width, totalHeight);

  let y = padding;

  ctx.fillStyle = "#FFB800";
  ctx.font = "bold 16px Inter, system-ui, sans-serif";
  ctx.fillText("*", padding, y + 18);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Inter, system-ui, sans-serif";
  ctx.fillText("Longshot Accumulator - OddsAura", padding + 18, y + 17);
  y += 28;

  ctx.strokeStyle = "rgba(255,184,0,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  y += 12;

  const statBoxW = (contentWidth - 12) / 4;
  const stats = [
    { label: "LEGS", value: String(data.totalLegs), color: "#ffffff" },
    { label: "ODDS", value: parseFloat(data.combinedOdds) > 99999 ? "99k+" : Number(data.combinedOdds).toLocaleString(), color: "#FFB800" },
    { label: "$1 RETURN", value: "$" + (parseFloat(data.potentialReturn) > 99999 ? "99k+" : Number(data.potentialReturn).toLocaleString()), color: "#00FFA3" },
    { label: "DAYS", value: String(data.daySpread), color: "#ffffff" },
  ];
  for (let i = 0; i < stats.length; i++) {
    const sx = padding + i * (statBoxW + 4);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, sx, y, statBoxW, 55, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 8px Inter, system-ui, sans-serif";
    ctx.fillText(stats[i].label, sx + 8, y + 16);
    ctx.fillStyle = stats[i].color;
    ctx.font = "bold 14px 'Roboto Mono', monospace";
    ctx.fillText(stats[i].value, sx + 8, y + 40);
  }
  y += 68;

  for (const dateKey of sortedDates) {
    const legs = groupedByDate[dateKey];
    const d = new Date(dateKey);
    const dateLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    ctx.fillStyle = "#FFB800";
    ctx.font = "bold 10px Inter, system-ui, sans-serif";
    ctx.fillText(dateLabel.toUpperCase() + " (" + legs.length + " legs)", padding, y + 14);
    y += 24;

    for (const leg of legs) {
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      roundRect(ctx, padding, y, contentWidth, 42, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, padding, y, contentWidth, 42, 4);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "500 10px Inter, system-ui, sans-serif";
      const matchLabel = leg.homeTeam + " vs " + leg.awayTeam;
      ctx.fillText(matchLabel.length > 32 ? matchLabel.substring(0, 30) + "…" : matchLabel, padding + 8, y + 14);

      ctx.fillStyle = "#FFB800";
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      ctx.fillText(leg.market, padding + 8, y + 28);

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "10px Inter, system-ui, sans-serif";
      const pickTrunc = leg.pick.length > 22 ? leg.pick.substring(0, 20) + "…" : leg.pick;
      ctx.fillText(pickTrunc, padding + 8, y + 38);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px 'Roboto Mono', monospace";
      const oddsText = "@" + parseFloat(leg.odds).toFixed(2);
      const oddsW = ctx.measureText(oddsText).width;
      ctx.fillText(oddsText, width - padding - 8 - oddsW, y + 26);

      y += 48;
    }
    y += 8;
  }

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  y += 12;

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "8px Inter, system-ui, sans-serif";
  const dateText = "Generated by OddsAura - " + new Date().toLocaleDateString();
  const dateWidth = ctx.measureText(dateText).width;
  ctx.fillText(dateText, (width - dateWidth) / 2, y + 10);

  return canvas;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function Longshot() {
  const { data, isLoading, error } = useQuery<LongshotAccumulator>({
    queryKey: ["/api/longshot"],
  });
  const { addItem } = useBetSlip();
  const { toast } = useToast();
  const [savingImage, setSavingImage] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="text-center py-12 text-white/50">Failed to load longshot accumulator</div>
      </div>
    );
  }

  const groupedByDate: Record<string, LongshotLeg[]> = {};
  for (const leg of data.legs) {
    const dateKey = leg.matchDate.split("T")[0];
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(leg);
  }
  const sortedDates = Object.keys(groupedByDate).sort();

  const avgConfidence = data.legs.length > 0
    ? Math.round(data.legs.reduce((s, l) => s + l.confidence, 0) / data.legs.length)
    : 0;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/">
          <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors" data-testid="button-back-longshot">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2" data-testid="text-longshot-title">
            <Zap className="w-5 h-5 text-[#FFB800]" />
            Longshot Accumulator
          </h1>
          <p className="text-xs text-white/50">Daily multi-bet across {data.daySpread} days, {data.leagueCount} leagues</p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-[#FFB800]/10 to-[#FF6B00]/10 border-[#FFB800]/20 p-4" data-testid="card-longshot-summary">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFB800]" />
            <span className="text-sm font-bold text-white">Today's Longshot</span>
          </div>
          <Badge variant="outline" className="border-[#FFB800]/30 text-[#FFB800] text-[10px]">
            <Calendar className="w-3 h-3 mr-1" />
            {data.generatedDate}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Total Legs</div>
            <div className="text-2xl font-mono font-black text-white" data-testid="text-total-legs">{data.totalLegs}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Combined Odds</div>
            <div className="text-2xl font-mono font-black text-[#FFB800]" data-testid="text-combined-odds">{parseFloat(data.combinedOdds) > 999999 ? "999,999+" : Number(data.combinedOdds).toLocaleString()}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">$1 Returns</div>
            <div className="text-2xl font-mono font-black text-[#00FFA3]" data-testid="text-potential-return">${parseFloat(data.potentialReturn) > 999999 ? "999,999+" : Number(data.potentialReturn).toLocaleString()}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Avg Confidence</div>
            <div className="text-2xl font-mono font-black text-white">{avgConfidence}%</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[10px] text-white/40">
          <Layers className="w-3 h-3" />
          <span>{data.daySpread} match days across {data.leagueCount} competitions</span>
          <span className="ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Refreshes daily at 06:00 UTC
          </span>
        </div>
      </Card>

      {data.legs.length > 0 && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-[#00FFA3] text-black text-xs gap-1.5 font-bold"
            onClick={() => {
              for (const leg of data.legs) {
                addItem({
                  matchId: leg.matchId,
                  homeTeam: leg.homeTeam,
                  awayTeam: leg.awayTeam,
                  competition: leg.competition,
                  market: {
                    market: leg.market,
                    pick: leg.pick,
                    confidence: leg.confidence,
                    odds: leg.odds,
                  },
                });
              }
              toast({
                title: "Added to My Picks!",
                description: `${data.totalLegs} selections added to your picks.`,
              });
            }}
            data-testid="button-add-all-picks"
          >
            <Star className="w-3.5 h-3.5" />
            Add All to My Picks
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-[#FFB800]/15 text-[#FFB800] text-xs gap-1.5 font-bold border border-[#FFB800]/20"
            disabled={savingImage}
            onClick={async () => {
              setSavingImage(true);
              try {
                const canvas = drawLongshotToCanvas(data, groupedByDate, sortedDates);
                const dataUrl = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.download = `longshot-acca-${data.generatedDate}.png`;
                link.href = dataUrl;
                link.click();
                toast({
                  title: "Image saved!",
                  description: "Your longshot accumulator has been saved as an image.",
                });
              } catch {
                toast({
                  title: "Save failed",
                  description: "Could not save image. Please try again.",
                  variant: "destructive",
                });
              } finally {
                setSavingImage(false);
              }
            }}
            data-testid="button-save-longshot-image"
          >
            {savingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {savingImage ? "Saving..." : "Save as Image"}
          </Button>
        </div>
      )}

      {data.legs.length === 0 ? (
        <Card className="bg-[#0d1520] border-white/5 p-8 text-center">
          <Target className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No upcoming matches available for accumulator</p>
        </Card>
      ) : (
        sortedDates.map((dateKey) => {
          const legs = groupedByDate[dateKey];
          return (
            <div key={dateKey} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-[#FFB800]" />
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{formatDate(dateKey)}</span>
                <Badge variant="outline" className="border-white/10 text-white/40 text-[10px]">{legs.length} legs</Badge>
              </div>

              {legs.map((leg, idx) => {
                const conf = leg.confidence;
                const color = conf >= 70 ? "#00FFA3" : conf >= 50 ? "#FFB800" : "#EF4444";
                const oddVal = parseFloat(leg.odds);

                return (
                  <Link key={`${leg.matchId}-${idx}`} href={`/match/${leg.matchId}`}>
                    <Card
                      className="bg-[#0d1520] border-white/5 hover:border-[#FFB800]/20 p-3 cursor-pointer transition-all duration-200 hover:bg-[#0d1520]/80"
                      data-testid={`card-longshot-leg-${leg.matchId}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <AnimatedConfidenceMeter value={conf} color={color} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {leg.homeCrest && <img src={leg.homeCrest} alt="" className="w-4 h-4" />}
                            <span className="text-xs font-bold text-white truncate">{leg.homeTeam}</span>
                            <span className="text-[10px] text-white/30">vs</span>
                            {leg.awayCrest && <img src={leg.awayCrest} alt="" className="w-4 h-4" />}
                            <span className="text-xs font-bold text-white truncate">{leg.awayTeam}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {leg.competitionEmblem && <img src={leg.competitionEmblem} alt="" className="w-3 h-3 opacity-50" />}
                            <span className="text-[10px] text-white/40 truncate">{leg.competition}</span>
                            <span className="text-[10px] text-white/30">{formatTime(leg.matchDate)}</span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <div className="text-xs font-bold text-[#FFB800]">{leg.market}</div>
                          <div className="text-[10px] text-white/70 max-w-[120px] truncate">{leg.pick}</div>
                          <div className="text-xs font-mono font-bold text-white mt-0.5">@{oddVal.toFixed(2)}</div>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          );
        })
      )}

      <Card className="bg-[#0d1520] border-white/5 p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-[#FFB800] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-white mb-1">How Longshot Works</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Our AI selects the best value picks across multiple days and leagues to build one accumulator ticket.
              All {data.totalLegs} selections must win for the bet to pay out. The combined odds reflect the
              multiplied individual odds. This is a high-risk, high-reward bet — small stakes recommended.
              The accumulator refreshes every day at 06:00 UTC with fresh picks from upcoming matches.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
