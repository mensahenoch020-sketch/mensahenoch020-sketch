import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { getMatches, getTopLeagueStandings, transformMatch, getHeadToHead, getTeamRecentMatches, getMatchDetails } from "./football-api";
import { generatePrediction, generateDailyPicks, generateOddsComparison, generateLongshotAccumulator, refreshTeamStats } from "./prediction-engine";
import type { MatchPrediction } from "@shared/schema";
import { generateAIResponse } from "./ai-advisor";

let cachedPredictions: MatchPrediction[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function fetchAndCachePredictions(dateFrom?: string, dateTo?: string): Promise<MatchPrediction[]> {
  const cacheKey = `${dateFrom || "default"}-${dateTo || "default"}`;
  const now = Date.now();
  if (cachedPredictions.length > 0 && now - lastFetchTime < CACHE_DURATION && !dateFrom) {
    return cachedPredictions;
  }

  try {
    const matchData = await getMatches(dateFrom, dateTo);
    const matches = matchData?.matches || [];
    const transformed = matches.map(transformMatch);

    const preds: MatchPrediction[] = [];
    for (const match of transformed) {
      try {
        const pred = await generatePrediction(match);
        preds.push(pred);
      } catch (err) {
        console.error(`Failed to generate prediction for match ${match.id}:`, err);
      }
    }

    if (!dateFrom) {
      cachedPredictions = preds;
      lastFetchTime = now;
    }
    return preds;
  } catch (err) {
    console.error("Failed to fetch matches:", err);
    return cachedPredictions;
  }
}

function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

function getNextRefreshTime(): { nextRefresh: string; msUntil: number } {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(6, 0, 0, 0);
  if (now.getUTCHours() >= 6) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return {
    nextRefresh: next.toISOString(),
    msUntil: next.getTime() - now.getTime(),
  };
}

async function generateAndStoreDailyPicks(): Promise<void> {
  const today = getTodayUTC();
  const existing = await storage.getDailyPicksByDate(today);
  if (existing.length > 0) return;

  try {
    const predictions = await fetchAndCachePredictions();
    const picks = await generateDailyPicks(predictions);

    for (const pick of picks) {
      const pred = predictions.find(p => p.matchId === pick.matchId);
      await storage.saveDailyPick({
        matchId: pick.matchId,
        pickType: pick.pickType,
        pick: pick.pick,
        confidence: pick.confidence,
        reasoning: pick.reasoning || "",
        pickDate: today,
        matchDate: pred?.matchDate || "",
        homeTeam: pred?.homeTeam || "",
        awayTeam: pred?.awayTeam || "",
        competition: pred?.competition || "",
        result: "pending",
      });
    }
    console.log(`[DailyPicks] Generated ${picks.length} picks for ${today}`);
  } catch (err) {
    console.error("[DailyPicks] Failed to generate:", err);
  }
}

function scheduleDailyPicks() {
  const { msUntil } = getNextRefreshTime();
  console.log(`[DailyPicks] Next refresh in ${Math.round(msUntil / 60000)} minutes`);

  setTimeout(async () => {
    await generateAndStoreDailyPicks();
    setInterval(async () => {
      await generateAndStoreDailyPicks();
    }, 24 * 60 * 60 * 1000);
  }, msUntil);

  generateAndStoreDailyPicks();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  refreshTeamStats().then(() => {
    console.log("[Startup] Team stats loaded from real standings data");
  }).catch(err => {
    console.error("[Startup] Failed to load team stats:", err);
  });

  scheduleDailyPicks();

  app.get("/api/predictions", async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const predictions = await fetchAndCachePredictions(dateFrom, dateTo);
      res.json(predictions);
    } catch (err) {
      console.error("Error fetching predictions:", err);
      res.status(500).json({ error: "Failed to fetch predictions" });
    }
  });

  app.get("/api/predictions/:matchId", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const predictions = await fetchAndCachePredictions();
      const pred = predictions.find(p => p.matchId === matchId);
      if (!pred) {
        return res.status(404).json({ error: "Prediction not found" });
      }
      res.json(pred);
    } catch (err) {
      console.error("Error fetching prediction:", err);
      res.status(500).json({ error: "Failed to fetch prediction" });
    }
  });

  app.get("/api/statistics", async (req, res) => {
    try {
      const today = new Date();
      const pastDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const from = pastDate.toISOString().split("T")[0];
      const to = futureDate.toISOString().split("T")[0];
      const predictions = await fetchAndCachePredictions(from, to);
      res.json(predictions);
    } catch (err) {
      console.error("Error fetching statistics data:", err);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  app.get("/api/standings", async (_req, res) => {
    try {
      const standings = await getTopLeagueStandings();
      res.json(standings);
    } catch (err) {
      console.error("Error fetching standings:", err);
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  app.get("/api/daily-picks", async (_req, res) => {
    try {
      const today = getTodayUTC();
      let picks = await storage.getDailyPicksByDate(today);

      if (picks.length === 0) {
        await generateAndStoreDailyPicks();
        picks = await storage.getDailyPicksByDate(today);
      }

      if (picks.length === 0) {
        const predictions = await fetchAndCachePredictions();
        const generated = await generateDailyPicks(predictions);
        res.json({
          picks: generated,
          refreshInfo: getNextRefreshTime(),
          pickDate: today,
        });
        return;
      }

      res.json({
        picks,
        refreshInfo: getNextRefreshTime(),
        pickDate: today,
      });
    } catch (err) {
      console.error("Error fetching daily picks:", err);
      res.status(500).json({ error: "Failed to fetch daily picks" });
    }
  });

  app.get("/api/longshot", async (_req, res) => {
    try {
      const predictions = await fetchAndCachePredictions();
      const accumulator = generateLongshotAccumulator(predictions);
      res.json(accumulator);
    } catch (err) {
      console.error("Error generating longshot accumulator:", err);
      res.status(500).json({ error: "Failed to generate longshot accumulator" });
    }
  });

  app.get("/api/daily-picks/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getPickHistory(limit);
      const grouped: Record<string, any[]> = {};
      for (const pick of history) {
        const date = pick.pickDate || "unknown";
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(pick);
      }
      res.json(grouped);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch pick history" });
    }
  });

  app.patch("/api/daily-picks/:id/result", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { result } = req.body;
      if (!result || !["won", "lost", "void"].includes(result)) {
        return res.status(400).json({ error: "Invalid result" });
      }
      await storage.updateDailyPickResult(id, result);

      const streaks = await storage.getStreaks();
      const currentStreak = streaks?.currentStreak || 0;
      const longestWin = streaks?.longestWinStreak || 0;
      const longestLoss = streaks?.longestLossStreak || 0;
      const lastResult = streaks?.lastResult || "";

      if (result === "won") {
        const newStreak = lastResult === "won" ? currentStreak + 1 : 1;
        await storage.updateStreaks({
          currentStreak: newStreak,
          longestWinStreak: Math.max(longestWin, newStreak),
          lastResult: "won",
        });
      } else if (result === "lost") {
        const newStreak = lastResult === "lost" ? currentStreak - 1 : -1;
        await storage.updateStreaks({
          currentStreak: newStreak,
          longestLossStreak: Math.max(longestLoss, Math.abs(newStreak)),
          lastResult: "lost",
        });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update pick result" });
    }
  });

  app.get("/api/streaks", async (_req, res) => {
    try {
      const streaks = await storage.getStreaks();
      res.json(streaks || { currentStreak: 0, longestWinStreak: 0, longestLossStreak: 0, lastResult: "" });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch streaks" });
    }
  });

  app.get("/api/leaderboard", async (_req, res) => {
    try {
      const entries = await storage.getLeaderboard();
      res.json(entries);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.post("/api/leaderboard", async (req, res) => {
    try {
      const { username, profileImage, totalPicks, correctPicks, accuracy, totalStaked, totalReturns, roi, winStreak } = req.body;
      if (!username) return res.status(400).json({ error: "username required" });
      const entry = await storage.upsertLeaderboardEntry({
        username,
        profileImage: profileImage || "",
        totalPicks: totalPicks || 0,
        correctPicks: correctPicks || 0,
        accuracy: accuracy || 0,
        totalStaked: totalStaked || "0",
        totalReturns: totalReturns || "0",
        roi: roi || 0,
        winStreak: winStreak || 0,
      });
      res.json(entry);
    } catch (err) {
      res.status(500).json({ error: "Failed to update leaderboard" });
    }
  });

  app.get("/api/performance-summary", async (req, res) => {
    try {
      const period = (req.query.period as string) || "week";
      const today = new Date();
      let daysBack = 7;
      if (period === "month") daysBack = 30;
      else if (period === "all") daysBack = 365;

      const startDate = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
      const from = startDate.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];

      const predictions = await fetchAndCachePredictions(from, to);
      const finished = predictions.filter(p => p.status === "FINISHED" && p.score && p.score.fullTime.home !== null);

      let wins = 0, losses = 0;
      const competitionStats: Record<string, { wins: number; total: number }> = {};
      const dailyResults: Record<string, { wins: number; total: number }> = {};

      for (const match of finished) {
        const homeGoals = match.score!.fullTime.home!;
        const awayGoals = match.score!.fullTime.away!;
        const actualResult = homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";
        const topPick = match.markets[0]?.pick.toLowerCase() || "";
        const predicted = topPick.includes("draw") ? "draw" :
          topPick.includes(match.homeTeam.toLowerCase().split(" ")[0]) ? "home" : "away";
        const isCorrect = predicted === actualResult;

        if (isCorrect) wins++;
        else losses++;

        if (!competitionStats[match.competition]) competitionStats[match.competition] = { wins: 0, total: 0 };
        competitionStats[match.competition].total++;
        if (isCorrect) competitionStats[match.competition].wins++;

        const dateKey = match.matchDate.split("T")[0];
        if (!dailyResults[dateKey]) dailyResults[dateKey] = { wins: 0, total: 0 };
        dailyResults[dateKey].total++;
        if (isCorrect) dailyResults[dateKey].wins++;
      }

      const bankroll = await storage.getAllBankrollEntries();
      let totalStaked = 0, totalReturns = 0, betWins = 0, betLosses = 0;
      for (const e of bankroll) {
        totalStaked += parseFloat(e.stake) || 0;
        totalReturns += parseFloat(e.payout || "0") || 0;
        if (e.result === "won") betWins++;
        else if (e.result === "lost") betLosses++;
      }

      const streaks = await storage.getStreaks();

      res.json({
        period,
        predictions: {
          total: finished.length,
          wins,
          losses,
          accuracy: finished.length > 0 ? Math.round((wins / finished.length) * 100) : 0,
        },
        bankroll: {
          totalStaked,
          totalReturns,
          profit: totalReturns - totalStaked,
          roi: totalStaked > 0 ? Math.round(((totalReturns - totalStaked) / totalStaked) * 100) : 0,
          wins: betWins,
          losses: betLosses,
        },
        streaks: streaks || { currentStreak: 0, longestWinStreak: 0, longestLossStreak: 0 },
        competitionStats: Object.entries(competitionStats).map(([name, s]) => ({
          name,
          accuracy: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0,
          total: s.total,
        })).sort((a, b) => b.accuracy - a.accuracy),
        dailyResults: Object.entries(dailyResults).map(([date, s]) => ({
          date,
          accuracy: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0,
          total: s.total,
          wins: s.wins,
        })).sort((a, b) => a.date.localeCompare(b.date)),
      });
    } catch (err) {
      console.error("Error fetching performance summary:", err);
      res.status(500).json({ error: "Failed to fetch performance summary" });
    }
  });

  app.get("/api/bankroll/export", async (_req, res) => {
    try {
      const entries = await storage.getAllBankrollEntries();
      const headers = ["Date", "Match", "Market", "Pick", "Stake", "Odds", "Result", "Payout"];
      const rows = entries.map(e => [
        new Date(e.createdAt).toLocaleDateString(),
        e.matchLabel,
        e.market,
        e.pick,
        e.stake,
        e.odds,
        e.result || "pending",
        e.payout || "0",
      ]);

      let totalStake = 0, totalPayout = 0;
      for (const e of entries) {
        totalStake += parseFloat(e.stake) || 0;
        totalPayout += parseFloat(e.payout || "0") || 0;
      }

      const csv = [
        headers.join(","),
        ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
        "",
        `"Total Staked","","","","${totalStake.toFixed(2)}","","","${totalPayout.toFixed(2)}"`,
        `"Profit/Loss","","","","${(totalPayout - totalStake).toFixed(2)}","","",""`,
        `"ROI","","","","${totalStake > 0 ? Math.round(((totalPayout - totalStake) / totalStake) * 100) : 0}%","","",""`,
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=bankroll_${getTodayUTC()}.csv`);
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: "Failed to export bankroll" });
    }
  });

  app.get("/api/predictions/:matchId/odds", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const predictions = await fetchAndCachePredictions();
      const pred = predictions.find(p => p.matchId === matchId);
      if (!pred) return res.status(404).json({ error: "Prediction not found" });
      const oddsComparison = generateOddsComparison(pred.markets);
      res.json(oddsComparison);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch odds comparison" });
    }
  });

  app.get("/api/matches/:matchId/h2h", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const h2hData = await getHeadToHead(matchId);
      if (!h2hData) return res.json({ matches: [] });
      const matches = (h2hData.matches || []).map((m: any) => ({
        id: m.id,
        date: m.utcDate,
        homeTeam: m.homeTeam?.name || "TBD",
        awayTeam: m.awayTeam?.name || "TBD",
        homeCrest: m.homeTeam?.crest || "",
        awayCrest: m.awayTeam?.crest || "",
        homeScore: m.score?.fullTime?.home,
        awayScore: m.score?.fullTime?.away,
        competition: m.competition?.name || "",
      }));
      res.json({
        matches,
        aggregates: h2hData.aggregates || null,
      });
    } catch (err) {
      console.error("Error fetching H2H:", err);
      res.json({ matches: [] });
    }
  });

  app.get("/api/teams/:teamId/form", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const data = await getTeamRecentMatches(teamId, 6);
      if (!data?.matches) return res.json([]);
      const form = data.matches
        .filter((m: any) => m.status === "FINISHED")
        .slice(0, 6)
        .map((m: any) => {
          const isHome = m.homeTeam?.id === teamId;
          const goalsFor = isHome ? m.score?.fullTime?.home : m.score?.fullTime?.away;
          const goalsAgainst = isHome ? m.score?.fullTime?.away : m.score?.fullTime?.home;
          let result = "D";
          if (goalsFor > goalsAgainst) result = "W";
          else if (goalsFor < goalsAgainst) result = "L";
          return {
            result,
            opponent: isHome ? m.awayTeam?.name : m.homeTeam?.name,
            score: `${m.score?.fullTime?.home}-${m.score?.fullTime?.away}`,
            date: m.utcDate,
            competition: m.competition?.name || "",
          };
        });
      res.json(form);
    } catch (err) {
      console.error("Error fetching team form:", err);
      res.json([]);
    }
  });

  app.get("/api/matches/:matchId/details", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const data = await getMatchDetails(matchId);
      if (!data) return res.json(null);
      res.json({
        goals: data.goals || [],
        bookings: data.bookings || [],
        substitutions: data.substitutions || [],
        referees: data.referees || [],
      });
    } catch (err) {
      console.error("Error fetching match details:", err);
      res.json(null);
    }
  });

  app.get("/api/favorites", async (_req, res) => {
    try {
      const favs = await storage.getAllFavorites();
      res.json(favs);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const { teamId, teamName, teamCrest } = req.body;
      if (!teamId || !teamName) return res.status(400).json({ error: "teamId and teamName required" });
      const fav = await storage.addFavorite({ teamId, teamName, teamCrest: teamCrest || "" });
      res.status(201).json(fav);
    } catch (err) {
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:teamId", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      await storage.removeFavorite(teamId);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  app.get("/api/bankroll", async (_req, res) => {
    try {
      const entries = await storage.getAllBankrollEntries();
      res.json(entries);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch bankroll" });
    }
  });

  app.post("/api/bankroll", async (req, res) => {
    try {
      const { matchId, matchLabel, market, pick, stake, odds, confidence, matchDate } = req.body;
      if (!matchLabel || !market || !pick) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const entry = await storage.addBankrollEntry({
        matchId: matchId || null,
        matchLabel,
        market,
        pick,
        stake: stake || "0",
        odds: odds || "0",
        confidence: confidence || null,
        matchDate: matchDate || null,
      });
      res.status(201).json(entry);
    } catch (err) {
      res.status(500).json({ error: "Failed to add entry" });
    }
  });

  app.post("/api/bankroll/bulk", async (req, res) => {
    try {
      const { entries } = req.body;
      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: "entries array required" });
      }
      const results = [];
      for (const e of entries) {
        if (!e.matchLabel || !e.market || !e.pick) continue;
        const entry = await storage.addBankrollEntry({
          matchId: e.matchId || null,
          matchLabel: e.matchLabel,
          market: e.market,
          pick: e.pick,
          stake: e.stake || "0",
          odds: e.odds || "0",
          confidence: e.confidence || null,
          matchDate: e.matchDate || null,
        });
        results.push(entry);
      }
      res.status(201).json({ logged: results.length, entries: results });
    } catch (err) {
      res.status(500).json({ error: "Failed to log picks" });
    }
  });

  async function runAutoResolve(): Promise<number> {
    const entries = await storage.getAllBankrollEntries();
    const pending = entries.filter(e => !e.result || e.result === "pending");
    if (pending.length === 0) return 0;

    const matchIds = [...new Set(pending.filter(e => e.matchId).map(e => e.matchId!))];
    let resolved = 0;

    const predictions = await fetchAndCachePredictions();
    
    for (const matchId of matchIds) {
      try {
        const cachedPred = predictions.find(p => p.matchId === matchId);
        let matchStatus: string | undefined;
        let homeGoalsRaw: number | null = null;
        let awayGoalsRaw: number | null = null;
        let homeTeamName = "";
        let awayTeamName = "";

        if (cachedPred && cachedPred.status === "FINISHED" && cachedPred.score?.fullTime && cachedPred.score.fullTime.home !== null) {
          matchStatus = cachedPred.status;
          homeGoalsRaw = cachedPred.score.fullTime.home;
          awayGoalsRaw = cachedPred.score.fullTime.away;
          homeTeamName = cachedPred.homeTeam;
          awayTeamName = cachedPred.awayTeam;
        } else if (cachedPred && cachedPred.status !== "FINISHED") {
          console.log(`[AutoResolve] Match ${matchId} not finished yet (status: ${cachedPred.status})`);
          continue;
        } else {
          await new Promise(r => setTimeout(r, 7000));
          const matchData = await getMatchDetails(matchId);
          if (!matchData) {
            console.log(`[AutoResolve] Match ${matchId}: could not fetch data`);
            continue;
          }
          matchStatus = matchData.status;
          homeGoalsRaw = matchData.score?.fullTime?.home ?? null;
          awayGoalsRaw = matchData.score?.fullTime?.away ?? null;
          homeTeamName = matchData.homeTeam?.name || matchData.homeTeam?.shortName || "";
          awayTeamName = matchData.awayTeam?.name || matchData.awayTeam?.shortName || "";
        }

        if (matchStatus !== "FINISHED" || homeGoalsRaw === null || awayGoalsRaw === null) {
          console.log(`[AutoResolve] Match ${matchId} not finished yet (status: ${matchStatus || "unknown"})`);
          continue;
        }

        const homeGoals = homeGoalsRaw;
        const awayGoals = awayGoalsRaw;
        const totalGoals = homeGoals + awayGoals;
        const bttsActual = homeGoals > 0 && awayGoals > 0;
        const actualResult = homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";

        const matchEntries = pending.filter(e => e.matchId === matchId);
        for (const entry of matchEntries) {
          let isCorrect: boolean | null = null;
          const pickLower = entry.pick.toLowerCase();
          const homeName = homeTeamName.toLowerCase().split(" ")[0];
          const awayName = awayTeamName.toLowerCase().split(" ")[0];

          if (entry.market === "1X2") {
            const predicted = pickLower.includes("draw") ? "draw" : pickLower.includes(homeName) ? "home" : "away";
            isCorrect = predicted === actualResult;
          } else if (entry.market.includes("BTTS")) {
            isCorrect = (pickLower.includes("yes") || pickLower.includes("gg")) === bttsActual;
          } else if (entry.market === "Over/Under 2.5") {
            isCorrect = pickLower.includes("over") ? totalGoals > 2.5 : totalGoals < 2.5;
          } else if (entry.market === "Over/Under 1.5") {
            isCorrect = pickLower.includes("over") ? totalGoals > 1.5 : totalGoals < 1.5;
          } else if (entry.market === "Over/Under 3.5") {
            isCorrect = pickLower.includes("over") ? totalGoals > 3.5 : totalGoals < 3.5;
          } else if (entry.market === "Over/Under 4.5") {
            isCorrect = pickLower.includes("over") ? totalGoals > 4.5 : totalGoals < 4.5;
          } else if (entry.market === "Double Chance") {
            if (pickLower.includes("draw")) {
              isCorrect = actualResult === "draw" ||
                (pickLower.includes(homeName) && actualResult === "home") ||
                (pickLower.includes(awayName) && actualResult === "away");
            } else {
              isCorrect = actualResult !== (pickLower.includes(homeName) ? "away" : "home");
            }
          } else if (entry.market === "Correct Score") {
            isCorrect = entry.pick === `${homeGoals}-${awayGoals}`;
          } else if (entry.market === "Home Team Goals O/U 1.5") {
            isCorrect = pickLower.includes("over") ? homeGoals > 1.5 : homeGoals < 1.5;
          } else if (entry.market === "Away Team Goals O/U 1.5") {
            isCorrect = pickLower.includes("over") ? awayGoals > 1.5 : awayGoals < 1.5;
          } else if (entry.market === "Odd/Even Goals") {
            isCorrect = pickLower === "odd" ? totalGoals % 2 === 1 : totalGoals % 2 === 0;
          } else if (entry.market.includes("Asian Handicap -0.5")) {
            const predicted = pickLower.includes(homeName) ? "home" : "away";
            isCorrect = predicted === actualResult;
          } else if (entry.market.includes("Asian Handicap -1.5")) {
            const predicted = pickLower.includes(homeName) ? "home" : "away";
            isCorrect = predicted === actualResult && Math.abs(homeGoals - awayGoals) >= 2;
          } else if (entry.market === "1X2 + Over/Under 2.5") {
            const resultPart = pickLower.includes("draw") ? "draw" : pickLower.includes(homeName) ? "home" : "away";
            const goalsCorrect = pickLower.includes("over") ? totalGoals > 2.5 : totalGoals < 2.5;
            isCorrect = resultPart === actualResult && goalsCorrect;
          } else if (entry.market === "1X2 + BTTS") {
            const resultPart = pickLower.includes("draw") ? "draw" : pickLower.includes(homeName) ? "home" : "away";
            const bttsCorrect = (pickLower.includes("gg") || !pickLower.includes("ng")) ? bttsActual : !bttsActual;
            isCorrect = resultPart === actualResult && bttsCorrect;
          } else if (entry.market === "Double Chance + O/U 2.5") {
            let dcCorrect = false;
            if (pickLower.includes("draw")) {
              dcCorrect = actualResult === "draw" || (pickLower.includes(homeName) && actualResult === "home") || (pickLower.includes(awayName) && actualResult === "away");
            } else {
              dcCorrect = actualResult !== (pickLower.includes(homeName) ? "away" : "home");
            }
            const goalsCorrect = pickLower.includes("over") ? totalGoals > 2.5 : totalGoals < 2.5;
            isCorrect = dcCorrect && goalsCorrect;
          } else if (entry.market === "Double Chance + BTTS") {
            let dcCorrect = false;
            if (pickLower.includes("draw")) {
              dcCorrect = actualResult === "draw" || (pickLower.includes(homeName) && actualResult === "home") || (pickLower.includes(awayName) && actualResult === "away");
            } else {
              dcCorrect = actualResult !== (pickLower.includes(homeName) ? "away" : "home");
            }
            const bttsCorrect = (pickLower.includes("gg") || !pickLower.includes("ng")) ? bttsActual : !bttsActual;
            isCorrect = dcCorrect && bttsCorrect;
          } else if (entry.market === "No Bet (Draw No Bet)") {
            if (actualResult === "draw") {
              isCorrect = null;
            } else {
              const predicted = pickLower.includes(homeName) ? "home" : "away";
              isCorrect = predicted === actualResult;
            }
          } else if (entry.market === "First Goal" || entry.market === "Last Goal") {
            if (totalGoals === 0) {
              isCorrect = false;
            } else {
              const predicted = pickLower.includes(homeName) ? "home" : "away";
              isCorrect = predicted === actualResult || (actualResult === "draw" && predicted === (homeGoals >= awayGoals ? "home" : "away"));
            }
          } else if (entry.market === "Winning Margin") {
            const margin = Math.abs(homeGoals - awayGoals);
            if (pickLower.includes("draw") || pickLower.includes("no win")) {
              isCorrect = actualResult === "draw";
            } else {
              const teamCorrect = pickLower.includes(homeName) ? actualResult === "home" : actualResult === "away";
              const marginMatch = pickLower.includes("1") ? margin === 1 : pickLower.includes("2") ? margin === 2 : pickLower.includes("3+") ? margin >= 3 : margin >= 1;
              isCorrect = teamCorrect && marginMatch;
            }
          } else if (entry.market === "Halftime Result" || entry.market === "HT/FT") {
            isCorrect = null;
          }

          if (isCorrect !== null) {
            const stake = parseFloat(entry.stake || "0") || 0;
            const odds = parseFloat(entry.odds || "0") || 0;
            const payout = isCorrect && stake > 0 ? (stake * odds).toFixed(2) : "0";
            const resultStr = isCorrect ? "won" : "lost";
            console.log(`[AutoResolve] Match ${matchId}: ${entry.matchLabel} | ${entry.market} "${entry.pick}" => ${resultStr} (Score: ${homeGoals}-${awayGoals})`);
            await storage.updateBankrollEntry(entry.id, resultStr, payout);
            resolved++;
          } else {
            console.log(`[AutoResolve] Match ${matchId}: Could not evaluate market "${entry.market}" pick "${entry.pick}"`);
          }
        }
      } catch (err) {
        console.error(`Auto-resolve error for match ${matchId}:`, err);
      }
    }

    return resolved;
  }

  setInterval(async () => {
    try {
      const resolved = await runAutoResolve();
      if (resolved > 0) {
        console.log(`[AutoResolve] Resolved ${resolved} bankroll entries`);
      }
    } catch (err) {
      console.error("[AutoResolve] Error:", err);
    }
  }, 15 * 60 * 1000);

  setTimeout(async () => {
    try {
      const resolved = await runAutoResolve();
      if (resolved > 0) {
        console.log(`[AutoResolve] Initial check resolved ${resolved} bankroll entries`);
      }
    } catch (err) {
      console.error("[AutoResolve] Initial check error:", err);
    }
  }, 30 * 1000);

  app.post("/api/bankroll/auto-resolve", async (_req, res) => {
    try {
      lastFetchTime = 0;
      const resolved = await runAutoResolve();
      res.json({ resolved });
    } catch (err) {
      res.status(500).json({ error: "Failed to auto-resolve" });
    }
  });

  app.patch("/api/bankroll/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { result, payout } = req.body;
      const entry = await storage.updateBankrollEntry(id, result, payout || "0");
      if (!entry) return res.status(404).json({ error: "Entry not found" });
      res.json(entry);
    } catch (err) {
      res.status(500).json({ error: "Failed to update entry" });
    }
  });

  app.delete("/api/bankroll/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBankrollEntry(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  app.post("/api/shared-picks", async (req, res) => {
    try {
      const { picks } = req.body;
      if (!picks || !Array.isArray(picks)) return res.status(400).json({ error: "picks array required" });
      const shareCode = Math.random().toString(36).substring(2, 10);
      const shared = await storage.createSharedPick({ shareCode, picksData: picks });
      res.status(201).json({ shareCode: shared.shareCode });
    } catch (err) {
      res.status(500).json({ error: "Failed to create shared picks" });
    }
  });

  app.get("/api/shared-picks/:code", async (req, res) => {
    try {
      const shared = await storage.getSharedPick(req.params.code);
      if (!shared) return res.status(404).json({ error: "Not found" });
      res.json(shared);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch shared picks" });
    }
  });

  app.get("/api/conversations", async (_req, res) => {
    try {
      const convs = await storage.getAllConversations();
      res.json(convs);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conv = await storage.getConversation(id);
      if (!conv) return res.status(404).json({ error: "Not found" });
      const msgs = await storage.getMessagesByConversation(id);
      res.json({ ...conv, messages: msgs });
    } catch (err) {
      console.error("Error fetching conversation:", err);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const { title } = req.body;
      const conv = await storage.createConversation(title || "New Chat");
      res.status(201).json(conv);
    } catch (err) {
      console.error("Error creating conversation:", err);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting conversation:", err);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const conv = await storage.getConversation(conversationId);
      if (!conv) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await storage.createMessage(conversationId, "user", content.trim());

      const predictions = await fetchAndCachePredictions();

      const existingMessages = await storage.getMessagesByConversation(conversationId);
      const recentMessages = existingMessages.slice(-20);
      const chatHistory = recentMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      try {
        const fullResponse = generateAIResponse(content.trim(), predictions, chatHistory);

        const chunks = fullResponse.match(/.{1,8}/gs) || [fullResponse];
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 15));
        }

        await storage.createMessage(conversationId, "assistant", fullResponse);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (aiError) {
        console.error("AI Advisor error:", aiError);
        const fallbackResponse = `I'm having a moment — let me give you the key data:\n\n` +
          predictions.slice(0, 5).map((p, i) => {
            const score = p.score && p.score.fullTime.home !== null ? ` (${p.score.fullTime.home}-${p.score.fullTime.away})` : "";
            return `${i + 1}. ${p.homeTeam} vs ${p.awayTeam}${score} — ${p.competition}\n   Home ${p.homeWinProb}% | Draw ${p.drawProb}% | Away ${p.awayWinProb}%\n   Top pick: ${p.markets[0]?.pick} (${p.markets[0]?.confidence}%)`;
          }).join("\n\n");

        await storage.createMessage(conversationId, "assistant", fallbackResponse);
        res.write(`data: ${JSON.stringify({ content: fallbackResponse })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    } catch (err) {
      console.error("Error sending message:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to process message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  return httpServer;
}
