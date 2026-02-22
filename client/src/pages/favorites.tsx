import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, Trash2, Search } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";

interface FavoriteTeam {
  id: number;
  teamId: number;
  teamName: string;
  teamCrest: string;
  createdAt: string;
}

export default function Favorites() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: favorites, isLoading } = useQuery<FavoriteTeam[]>({
    queryKey: ["/api/favorites"],
  });

  const removeMutation = useMutation({
    mutationFn: async (teamId: number) => {
      await apiRequest("DELETE", `/api/favorites/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: "Team removed from favorites" });
    },
  });

  const filtered = useMemo(() => {
    if (!favorites) return [];
    if (!search) return favorites;
    return favorites.filter(f => f.teamName.toLowerCase().includes(search.toLowerCase()));
  }, [favorites, search]);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white" data-testid="text-favorites-title">
            Favorite Teams
          </h1>
          <p className="text-sm text-white/60 mt-1">Follow teams to get quick access to their matches</p>
        </div>
      </div>

      {favorites && favorites.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FFA3]/50"
            placeholder="Search your favorites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-favorites"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-[#0d1520] border border-white/10 rounded-xl p-12 text-center">
          <Star className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-white mb-2">No Favorite Teams Yet</h3>
          <p className="text-sm text-white/60">
            Tap the star icon on any team in match details or analytics to follow them.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((fav) => (
            <Card key={fav.id} className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-4 text-center relative group" data-testid={`favorite-team-${fav.teamId}`}>
              {fav.teamCrest ? (
                <img src={fav.teamCrest} alt={fav.teamName} className="w-14 h-14 object-contain mx-auto mb-3 transition-transform group-hover:scale-110" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-[#00FFA3]">{fav.teamName.charAt(0)}</span>
                </div>
              )}
              <p className="text-sm font-bold text-white truncate">{fav.teamName}</p>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                onClick={() => removeMutation.mutate(fav.teamId)}
                data-testid={`button-remove-fav-${fav.teamId}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-white/30 mt-8">
        <p>Tip: Add teams from match detail pages or the analytics section</p>
      </div>
    </div>
  );
}
