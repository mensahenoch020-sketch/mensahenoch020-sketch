import type { MatchPrediction, PredictionMarket, MatchScore } from "@shared/schema";
import { getTopLeagueStandings, getTeamRecentMatches } from "./football-api";

// ============================================
// REAL TEAM DATA SYSTEM
// ============================================

interface TeamStats {
  teamId: number;
  teamName: string;
  position: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  competition: string;
  totalTeams: number;
  goalsPerGame: number;
  goalsConcededPerGame: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  elo: number;
}

let teamStatsCache: Map<string, TeamStats> = new Map();
let teamIdCache: Map<number, TeamStats> = new Map();
let lastStandingsRefresh = 0;
const STANDINGS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function normalizeTeamName(name: string): string {
  return name.toLowerCase()
    .replace(/\bfc\b/g, "")
    .replace(/\bsc\b/g, "")
    .replace(/\bcf\b/g, "")
    .replace(/\bac\b/g, "")
    .replace(/\bas\b/g, "")
    .replace(/\bssc\b/g, "")
    .replace(/\bud\b/g, "")
    .replace(/\brc\b/g, "")
    .replace(/\bcd\b/g, "")
    .replace(/\bsv\b/g, "")
    .replace(/\btsg\b/g, "")
    .replace(/\bvfb\b/g, "")
    .replace(/\bvfl\b/g, "")
    .replace(/\b1\.\b/g, "")
    .replace(/\bde\b/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function calculateEloFromStandings(stats: TeamStats): number {
  const positionScore = (1 - (stats.position - 1) / Math.max(1, stats.totalTeams - 1)) * 400;
  const gdScore = Math.max(-200, Math.min(200, stats.goalDifference * 5));
  const winRateScore = stats.winRate * 300;
  const gpgScore = stats.goalsPerGame * 80;
  const competitionBonus = getCompetitionTier(stats.competition);

  return Math.round(1200 + positionScore + gdScore + winRateScore + gpgScore + competitionBonus);
}

function getCompetitionTier(comp: string): number {
  const c = comp.toLowerCase();
  if (c.includes("premier league")) return 120;
  if (c.includes("la liga") || c.includes("laliga")) return 110;
  if (c.includes("bundesliga")) return 100;
  if (c.includes("serie a")) return 105;
  if (c.includes("ligue 1")) return 80;
  if (c.includes("champions")) return 130;
  if (c.includes("europa")) return 70;
  if (c.includes("eredivisie")) return 50;
  if (c.includes("primeira")) return 60;
  if (c.includes("championship")) return 40;
  if (c.includes("brasileirão") || c.includes("serie a") && c.includes("brazil")) return 55;
  return 30;
}

export async function refreshTeamStats(): Promise<void> {
  const now = Date.now();
  if (now - lastStandingsRefresh < STANDINGS_CACHE_DURATION && teamStatsCache.size > 0) {
    return;
  }

  try {
    console.log("[TeamStats] Fetching real standings data from Football Data API...");
    const standings = await getTopLeagueStandings();

    const newCache = new Map<string, TeamStats>();
    const newIdCache = new Map<number, TeamStats>();

    for (const league of standings) {
      const totalTeams = league.table?.length || 20;

      for (const entry of league.table || []) {
        const played = entry.playedGames || entry.played || 0;
        if (played === 0) continue;

        const stats: TeamStats = {
          teamId: entry.team?.id || 0,
          teamName: entry.team?.name || "Unknown",
          position: entry.position || 1,
          played,
          won: entry.won || 0,
          draw: entry.draw || 0,
          lost: entry.lost || 0,
          goalsFor: entry.goalsFor || 0,
          goalsAgainst: entry.goalsAgainst || 0,
          goalDifference: entry.goalDifference || 0,
          points: entry.points || 0,
          competition: league.competition || "Unknown",
          totalTeams,
          goalsPerGame: played > 0 ? (entry.goalsFor || 0) / played : 1.2,
          goalsConcededPerGame: played > 0 ? (entry.goalsAgainst || 0) / played : 1.2,
          winRate: played > 0 ? (entry.won || 0) / played : 0.33,
          drawRate: played > 0 ? (entry.draw || 0) / played : 0.33,
          lossRate: played > 0 ? (entry.lost || 0) / played : 0.33,
          elo: 0,
        };

        stats.elo = calculateEloFromStandings(stats);

        const teamName = entry.team?.name || "";
        newCache.set(teamName.toLowerCase(), stats);
        newCache.set(normalizeTeamName(teamName), stats);
        if (entry.team?.shortName) {
          newCache.set(entry.team.shortName.toLowerCase(), stats);
        }
        if (stats.teamId > 0) {
          newIdCache.set(stats.teamId, stats);
        }
      }
    }

    teamStatsCache = newCache;
    teamIdCache = newIdCache;
    lastStandingsRefresh = now;
    console.log(`[TeamStats] Loaded real stats for ${newIdCache.size} teams from ${standings.length} competitions`);
  } catch (err) {
    console.error("[TeamStats] Failed to fetch standings:", err);
  }
}

function lookupTeam(teamName: string, teamId?: number): TeamStats | null {
  if (teamId && teamIdCache.has(teamId)) {
    return teamIdCache.get(teamId)!;
  }
  const key = teamName.toLowerCase();
  if (teamStatsCache.has(key)) return teamStatsCache.get(key)!;
  const norm = normalizeTeamName(teamName);
  if (teamStatsCache.has(norm)) return teamStatsCache.get(norm)!;

  for (const [k, v] of teamStatsCache) {
    if (k.includes(norm) || norm.includes(k)) return v;
  }
  return null;
}

function getDefaultStats(teamName: string): TeamStats {
  return {
    teamId: 0,
    teamName,
    position: 10,
    played: 20,
    won: 7,
    draw: 6,
    lost: 7,
    goalsFor: 24,
    goalsAgainst: 24,
    goalDifference: 0,
    points: 27,
    competition: "Unknown",
    totalTeams: 20,
    goalsPerGame: 1.2,
    goalsConcededPerGame: 1.2,
    winRate: 0.35,
    drawRate: 0.30,
    lossRate: 0.35,
    elo: 1400,
  };
}

// ============================================
// MATH FUNCTIONS (kept correct, now fed real data)
// ============================================

function poissonProbability(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function eloExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function estimateXG(teamGoalsPerGame: number, oppConcededPerGame: number, isHome: boolean): number {
  const leagueAvg = 1.35;
  const attackStrength = teamGoalsPerGame / leagueAvg;
  const defenseWeakness = oppConcededPerGame / leagueAvg;
  const homeAdv = isHome ? 0.2 : -0.05;
  const xg = leagueAvg * attackStrength * defenseWeakness + homeAdv;
  return Math.max(0.25, Math.min(3.8, xg));
}

function monteCarloProbabilities(homeXG: number, awayXG: number, simulations: number = 10000): { home: number; draw: number; away: number } {
  let homeWins = 0, draws = 0, awayWins = 0;

  for (let i = 0; i < simulations; i++) {
    const homeGoals = poissonSampleRandom(homeXG);
    const awayGoals = poissonSampleRandom(awayXG);
    if (homeGoals > awayGoals) homeWins++;
    else if (homeGoals === awayGoals) draws++;
    else awayWins++;
  }
  return {
    home: Math.round((homeWins / simulations) * 100),
    draw: Math.round((draws / simulations) * 100),
    away: Math.round((awayWins / simulations) * 100),
  };
}

function poissonSampleRandom(lambda: number): number {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 15);
  return k - 1;
}

function computeBTTSProbability(homeXG: number, awayXG: number): number {
  const homeScoreProb = 1 - poissonProbability(homeXG, 0);
  const awayScoreProb = 1 - poissonProbability(awayXG, 0);
  return homeScoreProb * awayScoreProb;
}

function computeOverUnderProbability(homeXG: number, awayXG: number, line: number): number {
  let underProb = 0;
  for (let hg = 0; hg <= 8; hg++) {
    for (let ag = 0; ag <= 8; ag++) {
      if (hg + ag <= line) {
        underProb += poissonProbability(homeXG, hg) * poissonProbability(awayXG, ag);
      }
    }
  }
  return 1 - underProb;
}

function computeCorrectScore(homeXG: number, awayXG: number): { score: string; prob: number }[] {
  const scores: { score: string; prob: number }[] = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const prob = poissonProbability(homeXG, h) * poissonProbability(awayXG, a);
      scores.push({ score: `${h}-${a}`, prob });
    }
  }
  scores.sort((a, b) => b.prob - a.prob);
  return scores;
}

function kellyFraction(prob: number, odds: number): number {
  const q = 1 - prob;
  const f = (prob * odds - q) / odds;
  return Math.max(0, Math.min(0.25, f));
}

function probToOdds(prob: number): string {
  if (prob <= 0) return "99.00";
  const raw = 1 / (prob / 100);
  const withMargin = raw * 0.93;
  return Math.max(1.01, withMargin).toFixed(2);
}

// ============================================
// MARKET SELECTION
// ============================================

type MarketCategory = "result" | "safety" | "goals" | "btts" | "score" | "handicap" | "halftime" | "team_goals" | "combo" | "misc";

const MARKET_CATEGORIES: Record<string, MarketCategory> = {
  "1X2": "result",
  "Double Chance": "safety",
  "No Bet (Draw No Bet)": "safety",
  "BTTS (GG/NG)": "btts",
  "Over/Under 2.5": "goals",
  "Over/Under 1.5": "goals",
  "Over/Under 3.5": "goals",
  "Over/Under 4.5": "goals",
  "Correct Score": "score",
  "Exact Total Goals": "score",
  "Asian Handicap -0.5": "handicap",
  "Asian Handicap -1.5": "handicap",
  "HT/FT": "halftime",
  "Halftime Result": "halftime",
  "Home Team Goals O/U 1.5": "team_goals",
  "Away Team Goals O/U 1.5": "team_goals",
  "Winning Margin": "misc",
  "First Goal": "misc",
  "Last Goal": "misc",
  "Odd/Even Goals": "misc",
  "1X2 + Over/Under 2.5": "combo",
  "1X2 + BTTS": "combo",
  "Double Chance + O/U 2.5": "combo",
  "Double Chance + BTTS": "combo",
};

function seededRandom(seed: number, offset: number = 0): number {
  const s = ((seed + offset) * 9301 + 49297) % 233280;
  return s / 233280;
}

function teamNameToSeed(name: string): number {
  return name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
}

function selectTop3Markets(markets: PredictionMarket[], homeXG: number, awayXG: number, probs: { home: number; draw: number; away: number }, seed: number, matchId: number = 0, competition: string = ""): PredictionMarket[] {
  const totalXG = homeXG + awayXG;
  const probGap = Math.abs(probs.home - probs.away);
  const isDominant = probGap > 25;
  const isClose = probGap < 10;
  const isHighScoring = totalXG > 2.8;
  const isLowScoring = totalXG < 2.0;

  const profileKey = (isDominant ? "D" : isClose ? "C" : "M") + (isHighScoring ? "H" : isLowScoring ? "L" : "N");

  const profiles: Record<string, MarketCategory[][]> = {
    "DH": [["safety", "goals", "combo"], ["handicap", "btts", "combo"], ["result", "goals", "team_goals"], ["handicap", "btts", "halftime"], ["safety", "combo", "btts"]],
    "DL": [["result", "team_goals", "score"], ["safety", "halftime", "btts"], ["handicap", "score", "misc"], ["result", "goals", "halftime"], ["safety", "team_goals", "score"]],
    "DN": [["result", "btts", "goals"], ["handicap", "combo", "team_goals"], ["safety", "goals", "halftime"], ["result", "halftime", "btts"], ["handicap", "goals", "combo"]],
    "CH": [["btts", "goals", "combo"], ["goals", "combo", "misc"], ["btts", "result", "team_goals"], ["goals", "btts", "halftime"], ["combo", "team_goals", "result"]],
    "CL": [["goals", "score", "halftime"], ["result", "team_goals", "misc"], ["btts", "halftime", "score"], ["safety", "goals", "score"], ["result", "halftime", "team_goals"]],
    "CN": [["result", "btts", "goals"], ["halftime", "combo", "btts"], ["goals", "result", "misc"], ["safety", "btts", "halftime"], ["result", "combo", "team_goals"]],
    "MH": [["combo", "goals", "btts"], ["result", "goals", "team_goals"], ["btts", "combo", "handicap"], ["goals", "halftime", "result"], ["safety", "btts", "combo"]],
    "ML": [["result", "halftime", "team_goals"], ["goals", "score", "result"], ["halftime", "btts", "handicap"], ["safety", "goals", "team_goals"], ["result", "score", "misc"]],
    "MN": [["btts", "handicap", "halftime"], ["result", "combo", "goals"], ["goals", "team_goals", "misc"], ["combo", "btts", "result"], ["halftime", "goals", "handicap"], ["safety", "btts", "team_goals"], ["result", "goals", "combo"]],
  };

  const options = profiles[profileKey] || profiles["MN"];
  const compHash = competition.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const variantSeed = seed * 7 + matchId * 13 + compHash * 3;
  const variantIdx = Math.floor(seededRandom(variantSeed, 600) * options.length);
  const categoryPriority = options[variantIdx];

  const selected: PredictionMarket[] = [];
  const usedCategories = new Set<MarketCategory>();
  const usedMarkets = new Set<string>();

  for (const cat of categoryPriority) {
    if (selected.length >= 3) break;
    if (usedCategories.has(cat)) continue;

    const candidates = markets
      .filter(m => (MARKET_CATEGORIES[m.market] || "misc") === cat && !usedMarkets.has(m.market))
      .sort((a, b) => b.confidence - a.confidence);
    if (candidates.length === 0) continue;

    if (candidates.length > 1) {
      const shuffleR = seededRandom(variantSeed, 700 + selected.length * 31);
      if (shuffleR > 0.55 && candidates[1].confidence >= candidates[0].confidence - 10) {
        selected.push(candidates[1]);
        usedMarkets.add(candidates[1].market);
      } else {
        selected.push(candidates[0]);
        usedMarkets.add(candidates[0].market);
      }
    } else {
      selected.push(candidates[0]);
      usedMarkets.add(candidates[0].market);
    }
    usedCategories.add(cat);
  }

  if (selected.length < 3) {
    const remaining = markets
      .filter(m => !usedMarkets.has(m.market))
      .sort((a, b) => b.confidence - a.confidence);
    for (const m of remaining) {
      const cat = MARKET_CATEGORIES[m.market] || "misc";
      if (!usedCategories.has(cat)) {
        selected.push(m);
        usedMarkets.add(m.market);
        usedCategories.add(cat);
        if (selected.length >= 3) break;
      }
    }
  }

  if (selected.length < 3) {
    const remaining = markets
      .filter(m => !usedMarkets.has(m.market))
      .sort((a, b) => b.confidence - a.confidence);
    while (selected.length < 3 && remaining.length > 0) {
      selected.push(remaining.shift()!);
    }
  }

  selected.sort((a, b) => b.confidence - a.confidence);
  return selected;
}

// ============================================
// MARKET GENERATION (now using real xG)
// ============================================

function generateMarkets(homeXG: number, awayXG: number, probs: { home: number; draw: number; away: number }, homeTeam: string, awayTeam: string, seed: number, matchId: number = 0, competition: string = "", homeStats: TeamStats | null = null, awayStats: TeamStats | null = null): PredictionMarket[] {
  const winner = probs.home > probs.away ? homeTeam : awayTeam;
  const winnerProb = Math.max(probs.home, probs.away);

  const bttsProb = computeBTTSProbability(homeXG, awayXG);
  const bttsYes = bttsProb > 0.5;
  const bttsConf = Math.round(bttsYes ? bttsProb * 100 : (1 - bttsProb) * 100);

  const over25 = computeOverUnderProbability(homeXG, awayXG, 2);
  const over15 = computeOverUnderProbability(homeXG, awayXG, 1);
  const over35 = computeOverUnderProbability(homeXG, awayXG, 3);
  const over45 = computeOverUnderProbability(homeXG, awayXG, 4);

  const correctScores = computeCorrectScore(homeXG, awayXG);
  const topScore = correctScores[0];

  const dcProb = probs.home > probs.away
    ? Math.min(95, probs.home + probs.draw)
    : Math.min(95, probs.away + probs.draw);

  const homeElo = homeStats?.elo || 1400;
  const awayElo = awayStats?.elo || 1400;
  const htProb = probs.home > probs.away
    ? eloExpected(homeElo, awayElo) * 0.75
    : eloExpected(awayElo, homeElo) * 0.6;

  const homeTeamOver15 = computeOverUnderProbability(homeXG, 0, 1);
  const awayTeamOver15 = computeOverUnderProbability(awayXG, 0, 1);

  const totalXG = homeXG + awayXG;

  const homeDrawRate = homeStats?.drawRate ?? 0.27;
  const awayDrawRate = awayStats?.drawRate ?? 0.27;
  const avgDrawRate = (homeDrawRate + awayDrawRate) / 2;
  const oddGoalsProb = 0.46 + avgDrawRate * 0.1;

  const r = seededRandom(seed, 100);

  const allMarkets: PredictionMarket[] = [
    {
      market: "1X2",
      pick: probs.home > probs.away ? `${homeTeam} Win` : probs.away > probs.home ? `${awayTeam} Win` : "Draw",
      confidence: winnerProb,
      odds: probToOdds(winnerProb),
    },
    {
      market: "Double Chance",
      pick: probs.home > probs.away ? `${homeTeam} or Draw` : `${awayTeam} or Draw`,
      confidence: dcProb,
      odds: probToOdds(dcProb),
    },
    {
      market: "BTTS (GG/NG)",
      pick: bttsYes ? "Yes (GG)" : "No (NG)",
      confidence: bttsConf,
      odds: probToOdds(bttsConf),
    },
    {
      market: "Over/Under 2.5",
      pick: over25 > 0.5 ? "Over 2.5" : "Under 2.5",
      confidence: Math.round(Math.max(over25, 1 - over25) * 100),
      odds: probToOdds(Math.round(Math.max(over25, 1 - over25) * 100)),
    },
    {
      market: "Over/Under 1.5",
      pick: over15 > 0.5 ? "Over 1.5" : "Under 1.5",
      confidence: Math.round(Math.max(over15, 1 - over15) * 100),
      odds: probToOdds(Math.round(Math.max(over15, 1 - over15) * 100)),
    },
    {
      market: "Over/Under 3.5",
      pick: over35 > 0.5 ? "Over 3.5" : "Under 3.5",
      confidence: Math.round(Math.max(over35, 1 - over35) * 100),
      odds: probToOdds(Math.round(Math.max(over35, 1 - over35) * 100)),
    },
    {
      market: "Over/Under 4.5",
      pick: over45 > 0.5 ? "Over 4.5" : "Under 4.5",
      confidence: Math.round(Math.max(over45, 1 - over45) * 100 * 0.82),
      odds: probToOdds(Math.round(Math.max(over45, 1 - over45) * 100)),
    },
    {
      market: "Correct Score",
      pick: topScore.score,
      confidence: Math.round(topScore.prob * 100),
      odds: probToOdds(Math.round(topScore.prob * 100)),
    },
    {
      market: "Asian Handicap -0.5",
      pick: probs.home > probs.away ? `${homeTeam} -0.5` : `${awayTeam} -0.5`,
      confidence: winnerProb,
      odds: probToOdds(winnerProb),
    },
    {
      market: "Asian Handicap -1.5",
      pick: probs.home > probs.away ? `${homeTeam} -1.5` : `${awayTeam} -1.5`,
      confidence: Math.round(winnerProb * 0.65),
      odds: probToOdds(Math.round(winnerProb * 0.65)),
    },
    {
      market: "HT/FT",
      pick: probs.home > probs.away ? `${homeTeam}/${homeTeam}` : `Draw/${awayTeam}`,
      confidence: Math.round(htProb * 100),
      odds: probToOdds(Math.round(htProb * 100)),
    },
    {
      market: "Halftime Result",
      pick: probs.home > probs.away ? `${homeTeam} Lead` : probs.draw > probs.away * 0.8 ? "Draw" : `${awayTeam} Lead`,
      confidence: Math.round(Math.max(probs.home, probs.away, probs.draw) * 0.65),
      odds: probToOdds(Math.round(Math.max(probs.home, probs.away, probs.draw) * 0.65)),
    },
    {
      market: "Home Team Goals O/U 1.5",
      pick: homeTeamOver15 > 0.5 ? "Over 1.5" : "Under 1.5",
      confidence: Math.round(Math.max(homeTeamOver15, 1 - homeTeamOver15) * 100),
      odds: probToOdds(Math.round(Math.max(homeTeamOver15, 1 - homeTeamOver15) * 100)),
    },
    {
      market: "Away Team Goals O/U 1.5",
      pick: awayTeamOver15 > 0.5 ? "Over 1.5" : "Under 1.5",
      confidence: Math.round(Math.max(awayTeamOver15, 1 - awayTeamOver15) * 100),
      odds: probToOdds(Math.round(Math.max(awayTeamOver15, 1 - awayTeamOver15) * 100)),
    },
    {
      market: "Exact Total Goals",
      pick: totalXG < 1.5 ? "1 Goal" : totalXG < 2.5 ? "2 Goals" : "3 Goals",
      confidence: Math.round(poissonProbability(totalXG, Math.round(totalXG)) * 100),
      odds: probToOdds(Math.round(poissonProbability(totalXG, Math.round(totalXG)) * 100)),
    },
    {
      market: "Odd/Even Goals",
      pick: oddGoalsProb > 0.5 ? "Odd" : "Even",
      confidence: Math.round(Math.max(oddGoalsProb, 1 - oddGoalsProb) * 100),
      odds: "1.90",
    },
    {
      market: "Winning Margin",
      pick: probs.home > probs.away ? `${homeTeam} by 1` : `${awayTeam} by 1`,
      confidence: Math.round(poissonProbability(Math.abs(homeXG - awayXG), 1) * winnerProb),
      odds: "3.50",
    },
    {
      market: "No Bet (Draw No Bet)",
      pick: probs.home > probs.away ? `${homeTeam}` : `${awayTeam}`,
      confidence: Math.round(Math.min(90, winnerProb * 1.1)),
      odds: probToOdds(Math.round(Math.min(90, winnerProb * 1.1))),
    },
    {
      market: "First Goal",
      pick: probs.home > probs.away ? homeTeam : awayTeam,
      confidence: Math.round((probs.home > probs.away ? homeXG : awayXG) / (homeXG + awayXG) * 100 * 0.8),
      odds: probToOdds(Math.round((probs.home > probs.away ? homeXG : awayXG) / (homeXG + awayXG) * 100)),
    },
    {
      market: "Last Goal",
      pick: homeXG > awayXG ? homeTeam : awayTeam,
      confidence: Math.round(Math.max(homeXG, awayXG) / (homeXG + awayXG) * 100 * 0.75),
      odds: probToOdds(Math.round(Math.max(homeXG, awayXG) / (homeXG + awayXG) * 100)),
    },
    {
      market: "1X2 + Over/Under 2.5",
      pick: `${winner} Win & ${over25 > 0.5 ? "Over" : "Under"} 2.5`,
      confidence: Math.round(winnerProb * (over25 > 0.5 ? over25 : 1 - over25)),
      odds: probToOdds(Math.round(winnerProb * 0.6)),
    },
    {
      market: "1X2 + BTTS",
      pick: `${winner} Win & ${bttsYes ? "GG" : "NG"}`,
      confidence: Math.round(winnerProb * (bttsYes ? bttsProb : 1 - bttsProb)),
      odds: probToOdds(Math.round(winnerProb * 0.55)),
    },
    {
      market: "Double Chance + O/U 2.5",
      pick: `${winner} or Draw & ${over25 > 0.5 ? "Over" : "Under"} 2.5`,
      confidence: Math.round(Math.min(90, dcProb * (over25 > 0.5 ? over25 : 1 - over25))),
      odds: probToOdds(Math.round(Math.min(90, dcProb * 0.7))),
    },
    {
      market: "Double Chance + BTTS",
      pick: `${winner} or Draw & ${bttsYes ? "GG" : "NG"}`,
      confidence: Math.round(Math.min(88, dcProb * (bttsYes ? bttsProb : 1 - bttsProb))),
      odds: probToOdds(Math.round(Math.min(88, dcProb * 0.65))),
    },
  ];

  const top3 = selectTop3Markets(allMarkets, homeXG, awayXG, probs, seed, matchId, competition);
  const rest = allMarkets.filter(m => !top3.includes(m));
  return [...top3, ...rest];
}

function getOverallConfidence(markets: PredictionMarket[]): "Low" | "Mid" | "High" {
  const topMarkets = markets.slice(0, 5);
  const avg = topMarkets.reduce((s, m) => s + m.confidence, 0) / topMarkets.length;
  if (avg >= 55) return "High";
  if (avg >= 40) return "Mid";
  return "Low";
}

// ============================================
// MAIN PREDICTION GENERATOR (REAL DATA)
// ============================================

export async function generatePrediction(match: any): Promise<MatchPrediction> {
  await refreshTeamStats();

  const homeTeam = match.homeTeam?.name || match.homeTeam?.shortName || "Home";
  const awayTeam = match.awayTeam?.name || match.awayTeam?.shortName || "Away";
  const homeCrest = match.homeTeam?.crest || "";
  const awayCrest = match.awayTeam?.crest || "";
  const competition = match.competition?.name || "Unknown";
  const competitionEmblem = match.competition?.emblem || "";
  const matchDate = match.utcDate || new Date().toISOString();
  const matchId = match.id || 0;

  const homeStats = lookupTeam(homeTeam, match.homeTeam?.id);
  const awayStats = lookupTeam(awayTeam, match.awayTeam?.id);

  const hStats = homeStats || getDefaultStats(homeTeam);
  const aStats = awayStats || getDefaultStats(awayTeam);

  const hasRealData = homeStats !== null || awayStats !== null;
  const dataSource = homeStats && awayStats ? "full standings" : homeStats || awayStats ? "partial standings" : "estimated";

  const homeXG = estimateXG(hStats.goalsPerGame, aStats.goalsConcededPerGame, true);
  const awayXG = estimateXG(aStats.goalsPerGame, hStats.goalsConcededPerGame, false);

  const mcProbs = monteCarloProbabilities(homeXG, awayXG, 10000);

  const eloHome = Math.round(eloExpected(hStats.elo + 50, aStats.elo) * 100);
  const eloDraw = Math.round(15 + (hStats.drawRate + aStats.drawRate) / 2 * 25);
  const eloAway = 100 - eloHome - eloDraw;

  const bayesHome = Math.round(mcProbs.home * 0.45 + eloHome * 0.35 + (homeXG > awayXG ? 55 : 35) * 0.20);
  const bayesDraw = Math.round(mcProbs.draw * 0.45 + eloDraw * 0.35 + 25 * 0.20);
  const bayesAway = 100 - bayesHome - bayesDraw;

  const probs = {
    home: Math.max(8, bayesHome),
    draw: Math.max(8, Math.min(38, bayesDraw)),
    away: Math.max(8, bayesAway),
  };

  const total = probs.home + probs.draw + probs.away;
  probs.home = Math.round(probs.home / total * 100);
  probs.draw = Math.round(probs.draw / total * 100);
  probs.away = 100 - probs.home - probs.draw;

  const seed = teamNameToSeed(homeTeam + awayTeam);
  const markets = generateMarkets(homeXG, awayXG, probs, homeTeam, awayTeam, seed, matchId, competition, hStats, aStats);
  const overallConfidence = getOverallConfidence(markets);

  const top3Markets = markets.slice(0, 3);
  const favoredTeam = probs.home >= probs.away ? homeTeam : awayTeam;
  const favoredProb = Math.max(probs.home, probs.away);
  const totalXG = homeXG + awayXG;
  const probGap = Math.abs(probs.home - probs.away);
  const isDominant = favoredProb >= 55;
  const isClose = probGap < 12;
  const isHighScoring = totalXG > 2.8;
  const isLowScoring = totalXG < 2.0;

  const bttsProb = computeBTTSProbability(homeXG, awayXG);
  const over25Prob = computeOverUnderProbability(homeXG, awayXG, 2);
  const homeScoreProb = Math.round((1 - poissonProbability(homeXG, 0)) * 100);
  const awayScoreProb = Math.round((1 - poissonProbability(awayXG, 0)) * 100);
  const correctScores = computeCorrectScore(homeXG, awayXG);
  const topScore = correctScores[0];
  const cleanSheetHome = Math.round(poissonProbability(awayXG, 0) * 100);
  const cleanSheetAway = Math.round(poissonProbability(homeXG, 0) * 100);

  let aiSummary = "";

  const hPosLabel = homeStats ? `${hStats.position}${ordinal(hStats.position)} in ${hStats.competition}` : "";
  const aPosLabel = awayStats ? `${aStats.position}${ordinal(aStats.position)} in ${aStats.competition}` : "";

  if (homeStats && awayStats) {
    aiSummary += `Based on real league standings: ${homeTeam} sit ${hPosLabel} (${hStats.won}W ${hStats.draw}D ${hStats.lost}L, ${hStats.goalsFor} goals scored, ${hStats.goalsAgainst} conceded) while ${awayTeam} are ${aPosLabel} (${aStats.won}W ${aStats.draw}D ${aStats.lost}L, ${aStats.goalsFor} GF, ${aStats.goalsAgainst} GA). `;
  } else if (homeStats) {
    aiSummary += `${homeTeam} sit ${hPosLabel} (${hStats.won}W ${hStats.draw}D ${hStats.lost}L, GD: ${hStats.goalDifference > 0 ? "+" : ""}${hStats.goalDifference}). `;
  } else if (awayStats) {
    aiSummary += `${awayTeam} are ${aPosLabel} (${aStats.won}W ${aStats.draw}D ${aStats.lost}L, GD: ${aStats.goalDifference > 0 ? "+" : ""}${aStats.goalDifference}). `;
  }

  if (isDominant && isHighScoring) {
    aiSummary += `${favoredTeam} are strong favorites (${favoredProb}%) and goals look very likely. xG projection: ${homeTeam} ${homeXG.toFixed(1)} vs ${awayTeam} ${awayXG.toFixed(1)} (${totalXG.toFixed(1)} combined). There's a ${Math.round(over25Prob * 100)}% chance of Over 2.5 goals. `;
  } else if (isDominant && isLowScoring) {
    aiSummary += `${favoredTeam} should control this match (${favoredProb}%), but expect a tight affair. xG: ${homeTeam} ${homeXG.toFixed(1)} vs ${awayTeam} ${awayXG.toFixed(1)}. ${cleanSheetHome > 35 ? `${homeTeam} have a ${cleanSheetHome}% clean sheet chance. ` : ""}`;
  } else if (isDominant) {
    aiSummary += `${favoredTeam} are clear favorites at ${favoredProb}%. xG: ${homeTeam} ${homeXG.toFixed(1)} vs ${awayTeam} ${awayXG.toFixed(1)}. ${homeScoreProb > 80 ? `${homeTeam} have an ${homeScoreProb}% chance of scoring. ` : `${awayTeam} have an ${awayScoreProb}% chance of finding the net. `}`;
  } else if (isClose && isHighScoring) {
    aiSummary += `An open, evenly-matched contest. xG: ${homeTeam} ${homeXG.toFixed(1)} vs ${awayTeam} ${awayXG.toFixed(1)}. BTTS probability: ${Math.round(bttsProb * 100)}%, Over 2.5: ${Math.round(over25Prob * 100)}%. `;
  } else if (isClose && isLowScoring) {
    aiSummary += `A cagey contest expected. Clean sheet chances: ${cleanSheetHome}% (${homeTeam}), ${cleanSheetAway}% (${awayTeam}). xG: ${homeXG.toFixed(1)} vs ${awayXG.toFixed(1)}. Most likely score: ${topScore.score} (${Math.round(topScore.prob * 100)}%). `;
  } else if (isClose) {
    aiSummary += `Very tight match — ${homeTeam} (${probs.home}%) vs ${awayTeam} (${probs.away}%). xG: ${homeXG.toFixed(1)} vs ${awayXG.toFixed(1)}. BTTS: ${Math.round(bttsProb * 100)}%. `;
  } else if (isHighScoring) {
    aiSummary += `${favoredTeam} have the edge at ${favoredProb}% in what should be entertaining. Combined xG: ${totalXG.toFixed(1)} (${homeTeam} ${homeXG.toFixed(1)}, ${awayTeam} ${awayXG.toFixed(1)}). Over 2.5 at ${Math.round(over25Prob * 100)}%. `;
  } else {
    aiSummary += `${favoredTeam} are slight favorites at ${favoredProb}%. xG: ${homeTeam} ${homeXG.toFixed(1)} vs ${awayTeam} ${awayXG.toFixed(1)}. Both teams have scoring chances — ${homeScoreProb}% and ${awayScoreProb}% to score. `;
  }

  aiSummary += `Our models ran 10,000 Monte Carlo simulations. Most likely score: ${topScore.score} (${Math.round(topScore.prob * 100)}% probability). `;

  const top3Categories = top3Markets.map(m => MARKET_CATEGORIES[m.market] || "misc");
  const hasGoalsMarket = top3Categories.includes("goals") || top3Categories.includes("btts");
  const hasResultMarket = top3Categories.includes("result") || top3Categories.includes("handicap") || top3Categories.includes("safety");
  const hasComboMarket = top3Categories.includes("combo");

  if (hasGoalsMarket && hasResultMarket) {
    aiSummary += `We found value in both the result and goals markets. `;
  } else if (hasGoalsMarket) {
    aiSummary += `The goals markets stand out as the best value here. `;
  } else if (hasComboMarket) {
    aiSummary += `Combo bets offer the most interesting angles for this fixture. `;
  } else if (hasResultMarket) {
    aiSummary += `The result market offers the strongest value. `;
  }

  aiSummary += `\n\nOUR 3 TOP PICKS:\n`;
  top3Markets.forEach((m, i) => {
    const label = m.confidence >= 70 ? "Very Strong" : m.confidence >= 55 ? "Strong" : m.confidence >= 40 ? "Moderate" : "Value";
    aiSummary += `${i + 1}. ${m.market}: ${m.pick} (${m.confidence}% confidence — ${label})\n`;
  });

  if (!hasRealData) {
    aiSummary += `\nNote: Limited data available for these teams. Predictions are estimated.`;
  }

  if (overallConfidence === "High") {
    aiSummary += `\nSolid value across the board. Our confidence is high on this match.`;
  } else if (overallConfidence === "Mid") {
    aiSummary += `\nDecent value here but proceed with caution — mid-level confidence.`;
  } else {
    aiSummary += `\nLow confidence match — higher risk, consider smaller stakes or skip.`;
  }

  const score: MatchScore | undefined = match.score ? {
    fullTime: {
      home: match.score.fullTime?.home ?? null,
      away: match.score.fullTime?.away ?? null,
    },
    halfTime: {
      home: match.score.halfTime?.home ?? null,
      away: match.score.halfTime?.away ?? null,
    },
  } : undefined;

  return {
    matchId: match.id,
    homeTeam,
    awayTeam,
    homeTeamId: match.homeTeam?.id || 0,
    awayTeamId: match.awayTeam?.id || 0,
    homeCrest,
    awayCrest,
    competition,
    competitionEmblem,
    matchDate,
    status: match.status || "SCHEDULED",
    score,
    markets,
    aiSummary,
    overallConfidence,
    homeWinProb: probs.home,
    drawProb: probs.draw,
    awayWinProb: probs.away,
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
}

function winnerProb(probs: { home: number; draw: number; away: number }): number {
  return Math.max(probs.home, probs.away);
}

// ============================================
// ODDS COMPARISON (probability-derived estimates)
// ============================================

export function generateOddsComparison(markets: PredictionMarket[]): any[] {
  return markets.slice(0, 5).map(market => {
    const baseOdds = parseFloat(market.odds || "2.00");
    const variations = [
      { bookmaker: "Estimated Best", odds: (baseOdds * 1.05).toFixed(2) },
      { bookmaker: "Market Average", odds: baseOdds.toFixed(2) },
      { bookmaker: "Estimated Low", odds: (baseOdds * 0.95).toFixed(2) },
    ];

    return {
      market: market.market,
      pick: market.pick,
      confidence: market.confidence,
      bestOdds: variations[0],
      allOdds: variations,
    };
  });
}

// ============================================
// LONGSHOT ACCUMULATOR
// ============================================

export interface LongshotLeg {
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

export interface LongshotAccumulator {
  legs: LongshotLeg[];
  combinedOdds: string;
  totalLegs: number;
  potentialReturn: string;
  generatedDate: string;
  daySpread: number;
  leagueCount: number;
}

export function generateLongshotAccumulator(predictions: MatchPrediction[]): LongshotAccumulator {
  const emptyResult = { legs: [], combinedOdds: "0.00", totalLegs: 0, potentialReturn: "0.00", generatedDate: new Date().toISOString().split("T")[0], daySpread: 0, leagueCount: 0 };
  if (!predictions || predictions.length === 0) return emptyResult;

  const scheduled = predictions.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  if (scheduled.length === 0) return emptyResult;

  const byDate: Record<string, MatchPrediction[]> = {};
  for (const p of scheduled) {
    const dateKey = p.matchDate.split("T")[0];
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(p);
  }
  const sortedDates = Object.keys(byDate).sort();

  const targetLegs = Math.min(25, scheduled.length);
  const legsPerDay = Math.max(3, Math.ceil(targetLegs / sortedDates.length));

  const longshotMarkets = ["1X2", "Double Chance", "BTTS (GG/NG)", "Over/Under 2.5", "Over/Under 1.5",
    "Over/Under 3.5", "Asian Handicap -0.5", "HT/FT", "Halftime Result",
    "Home Team Goals O/U 1.5", "Away Team Goals O/U 1.5", "1X2 + Over/Under 2.5",
    "Double Chance + O/U 2.5", "Double Chance + BTTS", "No Bet (Draw No Bet)"];

  const allCandidates: { pred: MatchPrediction; market: PredictionMarket; score: number; odds: number }[] = [];

  for (const pred of scheduled) {
    for (const m of pred.markets) {
      if (!longshotMarkets.includes(m.market)) continue;
      const oddVal = parseFloat(m.odds || "1.50");
      if (oddVal < 1.15 || oddVal > 5.00) continue;
      const idealOdds = oddVal >= 1.30 && oddVal <= 3.50;
      const valueScore = m.confidence * 0.4 + (idealOdds ? 30 : 10) + Math.min(oddVal * 8, 30) * 0.3;
      allCandidates.push({ pred, market: m, score: valueScore, odds: oddVal });
    }
  }

  allCandidates.sort((a, b) => b.score - a.score);

  const legs: LongshotLeg[] = [];
  const usedMatches = new Set<number>();
  const usedDates = new Set<string>();
  const usedLeagues = new Set<string>();
  const dateCount: Record<string, number> = {};
  const marketTypeCount: Record<string, number> = {};

  const maxPerMarketType = Math.max(3, Math.ceil(targetLegs / 6));

  for (const { pred, market } of allCandidates) {
    if (legs.length >= targetLegs) break;
    if (usedMatches.has(pred.matchId)) continue;

    const dateKey = pred.matchDate.split("T")[0];
    if (!dateCount[dateKey]) dateCount[dateKey] = 0;
    if (dateCount[dateKey] >= legsPerDay + 2 && sortedDates.length > 1) continue;

    const mType = market.market;
    if (!marketTypeCount[mType]) marketTypeCount[mType] = 0;
    if (marketTypeCount[mType] >= maxPerMarketType) continue;

    legs.push({
      matchId: pred.matchId,
      homeTeam: pred.homeTeam,
      awayTeam: pred.awayTeam,
      homeCrest: pred.homeCrest,
      awayCrest: pred.awayCrest,
      competition: pred.competition,
      competitionEmblem: pred.competitionEmblem,
      matchDate: pred.matchDate,
      market: mType,
      pick: market.pick,
      confidence: market.confidence,
      odds: market.odds || "1.50",
    });
    usedMatches.add(pred.matchId);
    usedDates.add(dateKey);
    usedLeagues.add(pred.competition);
    dateCount[dateKey]++;
    marketTypeCount[mType]++;
  }

  legs.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

  let combinedOdds = 1;
  for (const leg of legs) {
    combinedOdds *= parseFloat(leg.odds);
  }

  return {
    legs,
    combinedOdds: combinedOdds.toFixed(2),
    totalLegs: legs.length,
    potentialReturn: combinedOdds.toFixed(2),
    generatedDate: new Date().toISOString().split("T")[0],
    daySpread: usedDates.size,
    leagueCount: usedLeagues.size,
  };
}

// ============================================
// DAILY PICKS
// ============================================

export async function generateDailyPicks(predictions: MatchPrediction[]): Promise<any[]> {
  if (!predictions || predictions.length === 0) return [];

  const sortedByConfidence = [...predictions]
    .sort((a, b) => {
      const aMax = Math.max(...a.markets.map(m => m.confidence));
      const bMax = Math.max(...b.markets.map(m => m.confidence));
      return bMax - aMax;
    })
    .slice(0, 5);

  return sortedByConfidence.map(pred => {
    const bestMarket = pred.markets.reduce((best, m) => m.confidence > best.confidence ? m : best);
    return {
      matchId: pred.matchId,
      pickType: bestMarket.market,
      pick: `${pred.homeTeam} vs ${pred.awayTeam}: ${bestMarket.pick}`,
      confidence: pred.overallConfidence,
      reasoning: pred.aiSummary?.slice(0, 150),
    };
  });
}
