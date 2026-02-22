import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, BarChart3, Download, RefreshCw, Loader2, Target } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface BankrollEntry {
  id: number;
  matchId: number | null;
  matchLabel: string;
  market: string;
  pick: string;
  stake: string | null;
  odds: string | null;
  confidence: number | null;
  matchDate: string | null;
  result: string | null;
  payout: string | null;
  createdAt: string;
}

export default function Bankroll() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ matchLabel: "", market: "", pick: "", odds: "" });
  const [resolving, setResolving] = useState(false);

  const { data: entries, isLoading } = useQuery<BankrollEntry[]>({
    queryKey: ["/api/bankroll"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/bankroll", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll"] });
      setShowForm(false);
      setFormData({ matchLabel: "", market: "", pick: "", odds: "" });
      toast({ title: "Pick logged!", description: "Your pick has been added." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, result, payout }: { id: number; result: string; payout: string }) => {
      const res = await apiRequest("PATCH", `/api/bankroll/${id}`, { result, payout });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bankroll/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll"] });
    },
  });

  const stats = useMemo(() => {
    if (!entries || entries.length === 0) return { total: 0, wins: 0, losses: 0, pending: 0, accuracy: 0 };
    let wins = 0, losses = 0, pending = 0;
    for (const e of entries) {
      if (e.result === "won") wins++;
      else if (e.result === "lost") losses++;
      else pending++;
    }
    const decided = wins + losses;
    const accuracy = decided > 0 ? Math.round((wins / decided) * 100) : 0;
    return { total: entries.length, wins, losses, pending, accuracy };
  }, [entries]);

  const handleSetResult = (entry: BankrollEntry, result: string) => {
    const stake = parseFloat(entry.stake || "0") || 0;
    const odds = parseFloat(entry.odds || "0") || 1;
    const payout = result === "won" && stake > 0 ? (stake * odds).toFixed(2) : "0";
    updateMutation.mutate({ id: entry.id, result, payout });
  };

  const handleAutoResolve = async () => {
    setResolving(true);
    try {
      const res = await apiRequest("POST", "/api/bankroll/auto-resolve", {});
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll"] });
      if (data.resolved > 0) {
        toast({
          title: `${data.resolved} pick${data.resolved === 1 ? "" : "s"} resolved!`,
          description: "Results have been updated from final scores.",
        });
      } else {
        toast({
          title: "No picks to resolve",
          description: "Either no pending picks have match IDs, or the matches haven't finished yet.",
        });
      }
    } catch (err) {
      toast({
        title: "Auto-resolve failed",
        description: "Could not check results. Try again later.",
        variant: "destructive",
      });
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
            Bankroll Tracker
          </h1>
          <p className="text-sm text-white/60 mt-1">Track your picks and see how they perform</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/20 text-white/70 gap-1"
            onClick={() => window.open("/api/bankroll/export", "_blank")}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            className="bg-[#00FFA3] text-black font-bold gap-1"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="w-4 h-4" />
            Log Pick
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 p-4 text-center">
          <Target className="w-5 h-5 text-[#00FFA3] mx-auto mb-2" />
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Picks</p>
          <p className="text-xl font-mono font-bold text-white">{stats.total}</p>
        </Card>
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 p-4 text-center">
          <CheckCircle className="w-5 h-5 text-[#00FFA3] mx-auto mb-2" />
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Won</p>
          <p className="text-xl font-mono font-bold text-[#00FFA3]">{stats.wins}</p>
        </Card>
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 p-4 text-center">
          <XCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Lost</p>
          <p className="text-xl font-mono font-bold text-red-400">{stats.losses}</p>
        </Card>
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 p-4 text-center">
          <BarChart3 className="w-5 h-5 text-[#FFB800] mx-auto mb-2" />
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Accuracy</p>
          <p className={`text-xl font-mono font-bold ${stats.accuracy >= 50 ? "text-[#00FFA3]" : "text-red-400"}`}>{stats.accuracy}%</p>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-2 text-sm flex-1">
          <Badge className="bg-amber-400/15 text-amber-400 border-amber-400/30 gap-1">
            <Clock className="w-3 h-3" /> {stats.pending} Pending
          </Badge>
        </div>
        {stats.pending > 0 && (
          <Button
            size="sm"
            className="bg-[#FFB800] text-black text-xs gap-1.5 font-bold hover:bg-[#FFB800]/90"
            onClick={handleAutoResolve}
            disabled={resolving}
          >
            {resolving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {resolving ? "Checking..." : "Check Results"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5">
          <h3 className="font-display font-bold text-white mb-4">Log a Pick Manually</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFA3]/50"
              placeholder="Match (e.g. Arsenal vs Chelsea)"
              value={formData.matchLabel}
              onChange={(e) => setFormData(p => ({ ...p, matchLabel: e.target.value }))}
            />
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFA3]/50"
              placeholder="Market (e.g. 1X2, Over 2.5)"
              value={formData.market}
              onChange={(e) => setFormData(p => ({ ...p, market: e.target.value }))}
            />
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFA3]/50"
              placeholder="Your Pick (e.g. Arsenal Win)"
              value={formData.pick}
              onChange={(e) => setFormData(p => ({ ...p, pick: e.target.value }))}
            />
          </div>
          <p className="text-[10px] text-white/30 mt-2">Odds are optional - just log what you picked</p>
          <div className="flex gap-2 mt-3">
            <Button
              className="bg-[#00FFA3] text-black font-bold"
              disabled={!formData.matchLabel || !formData.market || !formData.pick || addMutation.isPending}
              onClick={() => addMutation.mutate(formData)}
            >
              {addMutation.isPending ? "Adding..." : "Log Pick"}
            </Button>
            <Button variant="ghost" className="text-white/60" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : !entries || entries.length === 0 ? (
        <Card className="bg-[#0d1520] border border-white/10 rounded-xl p-12 text-center">
          <Target className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-white mb-2">No Picks Logged Yet</h3>
          <p className="text-sm text-white/60 max-w-sm mx-auto">Add picks from match pages using "My Picks", then tap "Log to Bankroll" to track them here. Results update automatically!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{entry.matchLabel}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">{entry.market}</Badge>
                    <span className="text-xs text-white/50">{entry.pick}</span>
                    {entry.confidence && entry.confidence > 0 && (
                      <span className={`text-[10px] font-mono font-bold ${
                        entry.confidence >= 70 ? "text-[#00FFA3]" :
                        entry.confidence >= 45 ? "text-[#FFB800]" : "text-red-400"
                      }`}>{entry.confidence}%</span>
                    )}
                  </div>
                  {(parseFloat(entry.odds || "0") > 0) && (
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/40 font-mono">
                      <span>Odds: {entry.odds}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.result === "pending" || !entry.result ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-[#00FFA3]/20 text-[#00FFA3] text-xs h-7 px-2"
                        onClick={() => handleSetResult(entry, "won")}
                      >
                        Won
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-400/20 text-red-400 text-xs h-7 px-2"
                        onClick={() => handleSetResult(entry, "lost")}
                      >
                        Lost
                      </Button>
                    </>
                  ) : (
                    <Badge className={`${entry.result === "won" ? "bg-[#00FFA3]/15 text-[#00FFA3] border-[#00FFA3]/30" : "bg-red-400/15 text-red-400 border-red-400/30"}`}>
                      {entry.result === "won" ? "Won" : "Lost"}
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white/20 hover:text-red-400 h-7 w-7"
                    onClick={() => deleteMutation.mutate(entry.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
