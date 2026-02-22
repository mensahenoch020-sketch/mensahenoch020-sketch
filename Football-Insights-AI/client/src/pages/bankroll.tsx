import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, CheckCircle, XCircle, Clock, BarChart3, Download } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface BankrollEntry {
  id: number;
  matchId: number | null;
  matchLabel: string;
  market: string;
  pick: string;
  stake: string;
  odds: string;
  result: string | null;
  payout: string | null;
  createdAt: string;
}

export default function Bankroll() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ matchLabel: "", market: "", pick: "", stake: "", odds: "" });

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
      setFormData({ matchLabel: "", market: "", pick: "", stake: "", odds: "" });
      toast({ title: "Bet added!", description: "Your bet has been logged." });
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
    if (!entries || entries.length === 0) return { totalStake: 0, totalPayout: 0, profit: 0, roi: 0, wins: 0, losses: 0, pending: 0 };
    let totalStake = 0, totalPayout = 0, wins = 0, losses = 0, pending = 0;
    for (const e of entries) {
      totalStake += parseFloat(e.stake) || 0;
      totalPayout += parseFloat(e.payout || "0") || 0;
      if (e.result === "won") wins++;
      else if (e.result === "lost") losses++;
      else pending++;
    }
    const profit = totalPayout - totalStake;
    const roi = totalStake > 0 ? Math.round((profit / totalStake) * 100) : 0;
    return { totalStake, totalPayout, profit, roi, wins, losses, pending };
  }, [entries]);

  const handleSetResult = (entry: BankrollEntry, result: string) => {
    const stake = parseFloat(entry.stake) || 0;
    const odds = parseFloat(entry.odds) || 1;
    const payout = result === "won" ? (stake * odds).toFixed(2) : "0";
    updateMutation.mutate({ id: entry.id, result, payout });
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white" data-testid="text-bankroll-title">
            Bankroll Tracker
          </h1>
          <p className="text-sm text-white/60 mt-1">Track your bets and monitor profit/loss over time</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/20 text-white/70 gap-1"
            onClick={() => {
              window.open("/api/bankroll/export", "_blank");
            }}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            className="bg-[#00FFA3] text-black font-bold gap-1"
            onClick={() => setShowForm(!showForm)}
            data-testid="button-add-bet"
          >
            <Plus className="w-4 h-4" />
            Log Bet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 p-4 text-center">
          <DollarSign className="w-5 h-5 text-[#00FFA3] mx-auto mb-2" />
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Staked</p>
          <p className="text-xl font-mono font-bold text-white">${stats.totalStake.toFixed(2)}</p>
        </Card>
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-[#00FFA3] mx-auto mb-2" />
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Returns</p>
          <p className="text-xl font-mono font-bold text-[#00FFA3]">${stats.totalPayout.toFixed(2)}</p>
        </Card>
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 p-4 text-center">
          {stats.profit >= 0 ? <TrendingUp className="w-5 h-5 text-[#00FFA3] mx-auto mb-2" /> : <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-2" />}
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Profit/Loss</p>
          <p className={`text-xl font-mono font-bold ${stats.profit >= 0 ? "text-[#00FFA3]" : "text-red-400"}`}>
            {stats.profit >= 0 ? "+" : ""}${stats.profit.toFixed(2)}
          </p>
        </Card>
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 p-4 text-center">
          <BarChart3 className="w-5 h-5 text-[#00FFA3] mx-auto mb-2" />
          <p className="text-[10px] text-white/40 uppercase tracking-wider">ROI</p>
          <p className={`text-xl font-mono font-bold ${stats.roi >= 0 ? "text-[#00FFA3]" : "text-red-400"}`}>{stats.roi}%</p>
        </Card>
      </div>

      <div className="flex gap-3 text-sm">
        <Badge className="bg-[#00FFA3]/15 text-[#00FFA3] border-[#00FFA3]/30 gap-1">
          <CheckCircle className="w-3 h-3" /> {stats.wins} Won
        </Badge>
        <Badge className="bg-red-400/15 text-red-400 border-red-400/30 gap-1">
          <XCircle className="w-3 h-3" /> {stats.losses} Lost
        </Badge>
        <Badge className="bg-amber-400/15 text-amber-400 border-amber-400/30 gap-1">
          <Clock className="w-3 h-3" /> {stats.pending} Pending
        </Badge>
      </div>

      {showForm && (
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-5">
          <h3 className="font-display font-bold text-white mb-4">Log a New Bet</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFA3]/50"
              placeholder="Match (e.g. Arsenal vs Chelsea)"
              value={formData.matchLabel}
              onChange={(e) => setFormData(p => ({ ...p, matchLabel: e.target.value }))}
              data-testid="input-match-label"
            />
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFA3]/50"
              placeholder="Market (e.g. 1X2, Over 2.5)"
              value={formData.market}
              onChange={(e) => setFormData(p => ({ ...p, market: e.target.value }))}
              data-testid="input-market"
            />
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFA3]/50"
              placeholder="Your Pick (e.g. Arsenal Win)"
              value={formData.pick}
              onChange={(e) => setFormData(p => ({ ...p, pick: e.target.value }))}
              data-testid="input-pick"
            />
            <div className="flex gap-2">
              <input
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFA3]/50 w-1/2"
                placeholder="Stake ($)"
                type="number"
                step="0.01"
                value={formData.stake}
                onChange={(e) => setFormData(p => ({ ...p, stake: e.target.value }))}
                data-testid="input-stake"
              />
              <input
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFA3]/50 w-1/2"
                placeholder="Odds"
                type="number"
                step="0.01"
                value={formData.odds}
                onChange={(e) => setFormData(p => ({ ...p, odds: e.target.value }))}
                data-testid="input-odds"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              className="bg-[#00FFA3] text-black font-bold"
              disabled={!formData.matchLabel || !formData.market || !formData.pick || !formData.stake || !formData.odds || addMutation.isPending}
              onClick={() => addMutation.mutate(formData)}
              data-testid="button-submit-bet"
            >
              {addMutation.isPending ? "Adding..." : "Add Bet"}
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
          <DollarSign className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-white mb-2">No Bets Logged Yet</h3>
          <p className="text-sm text-white/60">Start logging your bets to track your performance and profit/loss over time.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-4" data-testid={`bankroll-entry-${entry.id}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{entry.matchLabel}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">{entry.market}</Badge>
                    <span className="text-xs text-white/50">{entry.pick}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/40 font-mono">
                    <span>Stake: ${entry.stake}</span>
                    <span>Odds: {entry.odds}</span>
                    {entry.result === "won" && <span className="text-[#00FFA3]">Return: ${entry.payout}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.result === "pending" || !entry.result ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-[#00FFA3]/20 text-[#00FFA3] text-xs h-7 px-2"
                        onClick={() => handleSetResult(entry, "won")}
                        data-testid={`button-won-${entry.id}`}
                      >
                        Won
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-400/20 text-red-400 text-xs h-7 px-2"
                        onClick={() => handleSetResult(entry, "lost")}
                        data-testid={`button-lost-${entry.id}`}
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
                    data-testid={`button-delete-${entry.id}`}
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
