import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Target, BarChart3, Percent, HelpCircle } from "lucide-react";
import type { MatchPrediction } from "@shared/schema";

function AnimatedStatRing({ value, max, color }: { value: number; max: number; color: string }) {
  const radius = 22;
  const stroke = 3;
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? value / max : 0;
  const offset = circumference - percent * circumference;
  const dim = (radius + stroke) * 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
    </div>
  );
}

export function StatsOverview({ predictions }: { predictions?: MatchPrediction[] }) {
  const totalMatches = predictions?.length || 0;
  const highConfidence = predictions?.filter(p => p.overallConfidence === "High").length || 0;
  const avgConfidence = predictions && predictions.length > 0
    ? Math.round(predictions.reduce((sum, p) => {
        const maxConf = p.markets.length > 0
          ? Math.max(...p.markets.map(m => m.confidence))
          : 50;
        return sum + maxConf;
      }, 0) / predictions.length)
    : 0;
  const liveMatches = predictions?.filter(p => p.status === "IN_PLAY").length || 0;

  const stats = [
    { label: "Total Matches", value: totalMatches, icon: BarChart3, accent: "#00FFA3", max: Math.max(totalMatches, 30), tip: "Number of matches being analyzed right now" },
    { label: "High Confidence", value: highConfidence, icon: Target, accent: "#00FFA3", max: totalMatches || 1, tip: "Matches where our AI is very confident in the prediction" },
    { label: "Avg Confidence", value: avgConfidence, displayValue: `${avgConfidence}%`, icon: Percent, accent: "#FFB800", max: 100, tip: "Average confidence across all top picks — higher is better" },
    { label: "Live Now", value: liveMatches, icon: TrendingUp, accent: liveMatches > 0 ? "#00FFA3" : "#EF4444", max: Math.max(totalMatches, 1), tip: "Matches currently being played" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <Card
          key={i}
          className="bg-[#0d1520] border border-white/10 p-4 transition-all duration-300 hover:border-[#00FFA3]/20 hover:shadow-[0_0_20px_rgba(0,255,163,0.04)]"
          data-testid={`stat-card-${i}`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <AnimatedStatRing value={stat.value} max={stat.max} color={stat.accent} />
              <div className="absolute inset-0 flex items-center justify-center">
                <stat.icon className="w-4 h-4" style={{ color: stat.accent }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-mono font-bold text-white">{stat.displayValue || stat.value}</p>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">{stat.label}</p>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-2.5 h-2.5 text-white/15" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#1a1f2e] border-[#00FFA3]/20 text-white max-w-[200px]">
                    <p className="text-[11px]">{stat.tip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
