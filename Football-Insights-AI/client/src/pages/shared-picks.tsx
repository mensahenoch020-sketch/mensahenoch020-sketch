import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Trophy } from "lucide-react";

export default function SharedPicks() {
  const params = useParams<{ code: string }>();

  const { data, isLoading, error } = useQuery<{
    shareCode: string;
    picksData: any[];
    createdAt: string;
  }>({
    queryKey: ["/api/shared-picks", params.code],
    queryFn: async () => {
      const res = await fetch(`/api/shared-picks/${params.code}`);
      if (!res.ok) throw new Error("Picks not found");
      return res.json();
    },
  });

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );

  if (error || !data) return (
    <div className="p-6 text-center">
      <Share2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
      <h2 className="text-xl font-display font-bold text-white mb-2">Picks Not Found</h2>
      <p className="text-sm text-white/50 mb-4">This shared link may have expired or doesn't exist.</p>
      <Link href="/">
        <Button variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go to Dashboard
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Shared Picks</h1>
          <p className="text-xs text-white/40">
            Shared on {new Date(data.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {(Array.isArray(data.picksData) ? data.picksData : []).map((item: any, i: number) => (
          <Card key={i} className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-4" data-testid={`shared-pick-${i}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-[#00FFA3]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {item.homeTeam || "Home"} vs {item.awayTeam || "Away"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">
                    {item.market?.market || item.marketName || "Market"}
                  </Badge>
                  <span className="text-xs font-bold text-[#00FFA3]">
                    {item.market?.pick || item.pick || "Pick"}
                  </span>
                </div>
                {(item.market?.confidence || item.confidence) && (
                  <p className="text-[10px] text-white/30 mt-1 font-mono">
                    Confidence: {item.market?.confidence || item.confidence}%
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center pt-4">
        <p className="text-xs text-white/30 mb-3">Want to make your own predictions?</p>
        <Link href="/">
          <Button className="bg-[#00FFA3] text-black font-bold">
            Try OddsAura Free
          </Button>
        </Link>
      </div>
    </div>
  );
}
