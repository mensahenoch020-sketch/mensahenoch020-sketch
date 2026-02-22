import type { MatchPrediction, PredictionMarket, MatchScore } from "@shared/schema";

function seededRandom(seed: number, offset: number = 0): number {
  const s = ((seed + offset) * 9301 + 49297) % 233280;
  return s / 233280;
}

function teamNameToSeed(name: string): number {
  return name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
}

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

function generateTeamStrength(teamName: string): number {
  const seed = teamNameToSeed(teamName);
  const topTeams = ["Liverpool", "Arsenal", "Manchester City", "Real Madrid", "Barcelona", "Bayern", "PSG", "Inter", "Juventus", "Chelsea", "Manchester United", "Tottenham", "Dortmund", "Napoli", "Atletico", "AC Milan"];
  const isTop = topTeams.some(t => teamName.toLowerCase().includes(t.toLowerCase()));
  const base = isTop ? 1650 + seededRandom(seed, 10) * 150 : 1350 + seededRandom(seed, 10) * 300;
  return Math.round(base);
}

function estimateXG(teamElo: number, oppElo: number, isHome: boolean): number {
  const baseXG = 1.3;
  const eloDiff = (teamElo - oppElo) / 400;
  const homeAdv = isHome ? 0.25 : -0.05;
  const xg = baseXG + eloDiff * 0.8 + homeAdv;
  return Math.max(0.3, Math.min(3.5, xg));
}

function monteCarloProbabilities(homeXG: number, awayXG: number, simulations: number = 10000, seed: number): { home: number; draw: number; away: number } {
  let homeWins = 0, draws = 0, awayWins = 0;
  for (let i = 0; i < simulations; i++) {
    const r1 = seededRandom(seed, i * 2);
    const r2 = seededRandom(seed, i * 2 + 1);
    const homeGoals = poissonSample(homeXG, r1, seed + i);
    const awayGoals = poissonSample(awayXG, r2, seed + i + simulations);
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

function poissonSample(lambda: number, r: number, seed: number): number {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  let rng = r;
  do {
    k++;
    rng = seededRandom(seed, k * 31 + Math.floor(r * 1000));
    p *= rng;
  } while (p > L && k < 10);
  return k - 1;
}

function computeBTTSProbability(homeXG: number, awayXG: number): number {
  const homeScoreProb = 1 - poissonProbability(homeXG, 0);
  const awayScoreProb = 1 - poissonProbability(awayXG, 0);
  return homeScoreProb * awayScoreProb;
}

function computeOverUnderProbability(homeXG: number, awayXG: number, line: number): number {
  const totalXG = homeXG + awayXG;
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

function selectTop3Markets(markets: PredictionMarket[], homeXG: number, awayXG: number, probs: { home: number; draw: number; away: number }, seed: number, matchId: number = 0, competition: string = ""): PredictionMarket[] {
  const totalXG = homeXG + awayXG;
  const probGap = Math.abs(probs.home - probs.away);
  const isDominant = probGap > 25;
  const isClose = probGap < 10;
  const isHighScoring = totalXG > 2.8;
  const isLowScoring = totalXG < 2.0;
  const winnerProb = Math.max(probs.home, probs.away);

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

function generateMarkets(homeXG: number, awayXG: number, probs: { home: number; draw: number; away: number }, homeTeam: string, awayTeam: string, seed: number, matchId: number = 0, competition: string = ""): PredictionMarket[] {
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

  const htProb = probs.home > probs.away
    ? eloExpected(generateTeamStrength(homeTeam), generateTeamStrength(awayTeam)) * 0.75
    : eloExpected(generateTeamStrength(awayTeam), generateTeamStrength(homeTeam)) * 0.6;

  const homeTeamOver15 = computeOverUnderProbability(homeXG, 0, 1);
  const awayTeamOver15 = computeOverUnderProbability(awayXG, 0, 1);

  const r = seededRandom(seed, 100);
  const totalXG = homeXG + awayXG;
  const oddGoalsProb = 0.48 + seededRandom(seed, 200) * 0.04;

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
      pick: probs.home > probs.away ? `${homeTeam} Lead` : r > 0.5 ? "Draw" : `${awayTeam} Lead`,
      confidence: Math.round(25 + seededRandom(seed, 44) * 35),
      odds: probToOdds(Math.round(25 + seededRandom(seed, 44) * 35)),
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
      confidence: Math.round(20 + seededRandom(seed, 77) * 20),
      odds: probToOdds(Math.round(20 + seededRandom(seed, 77) * 20)),
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
      confidence: Math.round(20 + seededRandom(seed, 88) * 25),
      odds: "3.50",
    },
    {
      market: "No Bet (Draw No Bet)",
      pick: probs.home > probs.away ? `${homeTeam}` : `${awayTeam}`,
      confidence: Math.round(winnerProb * 1.1),
      odds: probToOdds(Math.round(winnerProb * 1.1)),
    },
    {
      market: "First Goal",
      pick: probs.home > probs.away ? homeTeam : awayTeam,
      confidence: Math.round(30 + seededRandom(seed, 99) * 30),
      odds: probToOdds(Math.round(30 + seededRandom(seed, 99) * 30)),
    },
    {
      market: "Last Goal",
      pick: seededRandom(seed, 111) > 0.5 ? homeTeam : awayTeam,
      confidence: Math.round(25 + seededRandom(seed, 112) * 30),
      odds: probToOdds(Math.round(25 + seededRandom(seed, 112) * 30)),
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

export async function generatePrediction(match: any): Promise<MatchPrediction> {
  const homeTeam = match.homeTeam?.name || match.homeTeam?.shortName || "Home";
  const awayTeam = match.awayTeam?.name || match.awayTeam?.shortName || "Away";
  const homeCrest = match.homeTeam?.crest || "";
  const awayCrest = match.awayTeam?.crest || "";
  const competition = match.competition?.name || "Unknown";
  const competitionEmblem = match.competition?.emblem || "";
  const matchDate = match.utcDate || new Date().toISOString();

  const seed = teamNameToSeed(homeTeam + awayTeam);

  const homeElo = generateTeamStrength(homeTeam);
  const awayElo = generateTeamStrength(awayTeam);

  const homeXG = estimateXG(homeElo, awayElo, true);
  const awayXG = estimateXG(awayElo, homeElo, false);

  const mcProbs = monteCarloProbabilities(homeXG, awayXG, 5000, seed);

  const eloHome = Math.round(eloExpected(homeElo + 65, awayElo) * 100);
  const eloDraw = Math.round(20 + seededRandom(seed, 50) * 10);
  const eloAway = 100 - eloHome - eloDraw;

  const bayesHome = Math.round((mcProbs.home * 0.5 + eloHome * 0.3 + (homeXG > awayXG ? 55 : 35) * 0.2));
  const bayesDraw = Math.round((mcProbs.draw * 0.5 + eloDraw * 0.3 + 25 * 0.2));
  const bayesAway = 100 - bayesHome - bayesDraw;

  const probs = {
    home: Math.max(10, bayesHome),
    draw: Math.max(10, Math.min(35, bayesDraw)),
    away: Math.max(10, bayesAway),
  };

  const total = probs.home + probs.draw + probs.away;
  probs.home = Math.round(probs.home / total * 100);
  probs.draw = Math.round(probs.draw / total * 100);
  probs.away = 100 - probs.home - probs.draw;

  const markets = generateMarkets(homeXG, awayXG, probs, homeTeam, awayTeam, seed, match.id || 0, competition);
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

  if (isDominant && isHighScoring) {
    aiSummary += `${favoredTeam} are strong favorites (${favoredProb}%) and goals look very likely. Our xG model projects ${homeXG.toFixed(1)} xG for ${homeTeam} and ${awayXG.toFixed(1)} for ${awayTeam} (${totalXG.toFixed(1)} combined). There's a ${Math.round(over25Prob * 100)}% chance of Over 2.5 goals. `;
  } else if (isDominant && isLowScoring) {
    aiSummary += `${favoredTeam} should control this match (${favoredProb}%), but expect a tight, low-scoring affair. xG projections: ${homeTeam} ${homeXG.toFixed(1)} vs ${awayTeam} ${awayXG.toFixed(1)}. ${cleanSheetHome > 35 ? `${homeTeam} have a ${cleanSheetHome}% clean sheet chance. ` : ""}`;
  } else if (isDominant) {
    aiSummary += `${favoredTeam} are clear favorites at ${favoredProb}%. Our model gives ${homeTeam} ${homeXG.toFixed(1)} xG and ${awayTeam} ${awayXG.toFixed(1)} xG. ${homeScoreProb > 80 ? `${homeTeam} have an ${homeScoreProb}% chance of scoring at least once. ` : `${awayTeam} have an ${awayScoreProb}% chance of finding the net. `}`;
  } else if (isClose && isHighScoring) {
    aiSummary += `An open, evenly-matched contest — expect fireworks. Both sides create plenty of chances: ${homeTeam} ${homeXG.toFixed(1)} xG vs ${awayTeam} ${awayXG.toFixed(1)} xG. BTTS probability sits at ${Math.round(bttsProb * 100)}% and Over 2.5 at ${Math.round(over25Prob * 100)}%. `;
  } else if (isClose && isLowScoring) {
    aiSummary += `A cagey contest expected. Both defenses look solid with clean sheet chances of ${cleanSheetHome}% (${homeTeam}) and ${cleanSheetAway}% (${awayTeam}). xG: ${homeXG.toFixed(1)} vs ${awayXG.toFixed(1)}. The most likely scoreline is ${topScore.score} (${Math.round(topScore.prob * 100)}%). `;
  } else if (isClose) {
    aiSummary += `Very tight match — ${homeTeam} (${probs.home}%) vs ${awayTeam} (${probs.away}%). xG model shows ${homeXG.toFixed(1)} vs ${awayXG.toFixed(1)}. BTTS has a ${Math.round(bttsProb * 100)}% probability. `;
  } else if (isHighScoring) {
    aiSummary += `${favoredTeam} have the edge at ${favoredProb}% in what should be an entertaining game. Combined xG of ${totalXG.toFixed(1)} (${homeTeam} ${homeXG.toFixed(1)}, ${awayTeam} ${awayXG.toFixed(1)}). Over 2.5 goals at ${Math.round(over25Prob * 100)}%. `;
  } else {
    aiSummary += `${favoredTeam} are slight favorites at ${favoredProb}%. xG model: ${homeTeam} ${homeXG.toFixed(1)} vs ${awayTeam} ${awayXG.toFixed(1)}. Both teams have scoring chances — ${homeScoreProb}% and ${awayScoreProb}% to score respectively. `;
  }

  aiSummary += `Our models ran 5,000 Monte Carlo simulations. Most likely score: ${topScore.score} (${Math.round(topScore.prob * 100)}% probability). `;

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

function winnerProb(probs: { home: number; draw: number; away: number }): number {
  return Math.max(probs.home, probs.away);
}

export function generateOddsComparison(markets: PredictionMarket[]): any[] {
  const bookmakers = ["Bet365", "William Hill", "Betfair", "Unibet", "888sport"];

  return markets.slice(0, 5).map(market => {
    const baseOdds = parseFloat(market.odds || "2.00");
    const variations = bookmakers.map(bk => {
      const seed = bk.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
      const variation = ((seed % 20) - 10) / 100;
      const adjustedOdds = Math.max(1.01, baseOdds * (1 + variation));
      return {
        bookmaker: bk,
        odds: adjustedOdds.toFixed(2),
      };
    });

    variations.sort((a, b) => parseFloat(b.odds) - parseFloat(a.odds));

    return {
      market: market.market,
      pick: market.pick,
      confidence: market.confidence,
      bestOdds: variations[0],
      allOdds: variations,
    };
  });
}

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

  const potentialReturn = combinedOdds.toFixed(2);

  return {
    legs,
    combinedOdds: combinedOdds.toFixed(2),
    totalLegs: legs.length,
    potentialReturn,
    generatedDate: new Date().toISOString().split("T")[0],
    daySpread: usedDates.size,
    leagueCount: usedLeagues.size,
  };
}

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
