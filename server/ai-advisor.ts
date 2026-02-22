import type { MatchPrediction, PredictionMarket } from "@shared/schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ============================================
// DATE FILTERING SYSTEM
// ============================================

function getLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMatchDateKey(matchDate: string): string {
  const d = new Date(matchDate);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function getMatchLocalDateKey(matchDate: string): string {
  const d = new Date(matchDate);
  return getLocalDateKey(d);
}

function getUTCDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function getTodayKey(): string {
  return getUTCDateKey(new Date());
}

function getTomorrowKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return getUTCDateKey(d);
}

function getYesterdayKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return getUTCDateKey(d);
}

function getWeekendKeys(): string[] {
  const keys: string[] = [];
  const today = new Date();
  for (let i = 0; i <= 7; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    const day = d.getUTCDay();
    if (day === 0 || day === 6) {
      keys.push(getUTCDateKey(d));
    }
  }
  return keys;
}

type DateIntent = "today" | "tomorrow" | "yesterday" | "weekend" | "all";

function detectDateIntent(query: string): DateIntent {
  const q = query.toLowerCase();
  if (/\btoday\b|\btonight\b|\btoday'?s\b|\bthis\s*evening\b/.test(q)) return "today";
  if (/\btomorrow\b|\btomorrow'?s\b/.test(q)) return "tomorrow";
  if (/\byesterday\b|\blast\s*night\b/.test(q)) return "yesterday";
  if (/\bweekend\b|\bsaturday\b|\bsunday\b|\bthis\s*weekend\b/.test(q)) return "weekend";
  return "all";
}

function filterByDate(predictions: MatchPrediction[], dateIntent: DateIntent): MatchPrediction[] {
  if (dateIntent === "all") return predictions;

  let targetKeys: string[];
  switch (dateIntent) {
    case "today":
      targetKeys = [getTodayKey()];
      break;
    case "tomorrow":
      targetKeys = [getTomorrowKey()];
      break;
    case "yesterday":
      targetKeys = [getYesterdayKey()];
      break;
    case "weekend":
      targetKeys = getWeekendKeys();
      break;
    default:
      return predictions;
  }

  return predictions.filter(p => {
    const matchKey = getMatchDateKey(p.matchDate);
    return targetKeys.includes(matchKey);
  });
}

function getDateLabel(dateIntent: DateIntent): string {
  switch (dateIntent) {
    case "today": return "today";
    case "tomorrow": return "tomorrow";
    case "yesterday": return "yesterday";
    case "weekend": return "this weekend";
    default: return "";
  }
}

// ============================================
// SEARCH & MATCHING
// ============================================

function findMatchesByQuery(predictions: MatchPrediction[], query: string): MatchPrediction[] {
  const q = query.toLowerCase();
  return predictions.filter(p =>
    p.homeTeam.toLowerCase().includes(q) ||
    p.awayTeam.toLowerCase().includes(q) ||
    p.competition.toLowerCase().includes(q)
  );
}

function findBestMatch(predictions: MatchPrediction[], query: string): MatchPrediction | null {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);

  let best: MatchPrediction | null = null;
  let bestScore = 0;

  for (const p of predictions) {
    let score = 0;
    const matchText = `${p.homeTeam} ${p.awayTeam} ${p.competition}`.toLowerCase();
    for (const w of words) {
      if (matchText.includes(w)) score += 1;
    }
    if (p.homeTeam.toLowerCase().includes(q) || p.awayTeam.toLowerCase().includes(q)) score += 5;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore > 0 ? best : null;
}

function extractPickCount(query: string): number {
  const match = query.match(/(\d+)\s*(pick|bet|selection|tip|game|match)/i);
  if (match) return Math.min(parseInt(match[1]), 30);
  const wordNums: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20 };
  for (const [word, num] of Object.entries(wordNums)) {
    if (query.toLowerCase().includes(word)) return num;
  }
  return 0;
}

// ============================================
// INTENT DETECTION
// ============================================

function detectIntent(query: string): string {
  const q = query.toLowerCase();

  if (/greet|hello|hi|hey|howdy|good\s*(morning|evening|afternoon)|what'?s up|sup/.test(q)) return "greeting";
  if (/help|what can you|how do|explain|tutorial|guide|how does/.test(q)) return "help";
  if (/accumulator|acca|multi|parlay|longshot|combo\s*bet/.test(q)) return "accumulator";
  if (/btts|both\s*teams?\s*to\s*score|gg|ng/.test(q)) return "btts";
  if (/over|under|goals?\s*line|total\s*goals|o\/u|ou/.test(q)) return "over_under";
  if (/what.*market|explain.*market|1x2|double\s*chance|handicap|asian/.test(q)) return "explain_market";
  if (/how.*work|what.*mean|beginner|new\s*to/.test(q)) return "explain_betting";
  if (/clean\s*sheet|shut\s*out|nil|zero|no\s*goal/.test(q)) return "clean_sheet";
  if (/correct\s*score|exact\s*score|scoreline|final\s*score/.test(q)) return "correct_score";

  if (extractPickCount(q) > 0) return "bulk_picks";
  if (/give\s*me.*pick|make.*bet\s*slip|build.*slip|create.*slip|pick.*for\s*me|picks\s*for/i.test(q)) return "bulk_picks";

  if (/daily\s*pick|top\s*pick|best\s*pick|recommend|suggestion|what.*bet|what.*back|tip/.test(q)) return "daily_picks";
  if (/live|in.?play|playing\s*now|happening\s*now|current/.test(q)) return "live";
  if (/result|score|finish|end|how did|who won|final/.test(q)) return "results";
  if (/safe|low\s*risk|secure|banker|certain|sure/.test(q)) return "safe_picks";
  if (/value|high\s*odds|risky|longshot|upset|underdog/.test(q)) return "value_picks";
  if (/compare|vs|versus|head.?to.?head|h2h|matchup|face/.test(q)) return "compare";
  if (/standing|table|league|rank|position|points/.test(q)) return "standings";
  if (/today|tonight|tomorrow|this\s*weekend|upcoming|next|game|match|fixture/.test(q)) return "upcoming";
  if (/premier\s*league|la\s*liga|serie\s*a|bundesliga|ligue\s*1|champions\s*league|europa/.test(q)) return "league_specific";
  if (/confident|strongest|best\s*confidence|most\s*likely/.test(q)) return "high_confidence";

  return "match_query";
}

// ============================================
// FORMATTING HELPERS
// ============================================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getTodayString(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function getMatchDayLabel(dateStr: string): string {
  const matchDate = new Date(dateStr);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const matchStart = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
  const diffDays = Math.floor((matchStart.getTime() - todayStart.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return matchDate.toLocaleDateString("en-US", { weekday: "long" });
  return formatDate(dateStr);
}

function getConfidenceLabel(c: number): string {
  if (c >= 75) return "very strong";
  if (c >= 60) return "strong";
  if (c >= 45) return "moderate";
  return "value play";
}

// ============================================
// RESPONSE GENERATORS (all date-aware)
// ============================================

function generateGreeting(predictions: MatchPrediction[]): string {
  const todayPreds = filterByDate(predictions, "today");
  const live = todayPreds.filter(p => p.status === "IN_PLAY");
  const scheduled = todayPreds.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const finished = todayPreds.filter(p => p.status === "FINISHED");
  const today = getTodayString();

  let msg = `Hey there! Welcome to OddsAura. I'm your football prediction advisor, powered by real league standings and statistical analysis.\n\n`;
  msg += `Today is **${today}**. Here's what's happening today:\n`;
  if (live.length > 0) msg += `- ${live.length} match${live.length > 1 ? "es" : ""} LIVE right now\n`;
  msg += `- ${scheduled.length} upcoming match${scheduled.length !== 1 ? "es" : ""} today\n`;
  if (finished.length > 0) msg += `- ${finished.length} completed match${finished.length !== 1 ? "es" : ""}\n`;

  const allScheduled = predictions.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  if (allScheduled.length > scheduled.length) {
    msg += `- ${allScheduled.length - scheduled.length} more matches in the coming days\n`;
  }

  const competitions = [...new Set(todayPreds.map(p => p.competition))];
  if (competitions.length > 0) {
    msg += `\nToday's competitions: ${competitions.slice(0, 6).join(", ")}${competitions.length > 6 ? ` and ${competitions.length - 6} more` : ""}.\n\n`;
  } else {
    msg += `\nNo matches today, but I have predictions for upcoming fixtures!\n\n`;
  }

  msg += `Ask me anything! I can help with:\n`;
  msg += `- "Today's picks" — only today's matches\n`;
  msg += `- "Tomorrow's picks" — tomorrow's fixtures\n`;
  msg += `- Match predictions and analysis\n`;
  msg += `- Explaining betting markets (BTTS, Over/Under, etc.)\n`;
  msg += `- Finding safe bets or value picks`;

  return msg;
}

function generateHelp(): string {
  return `I'm your OddsAura AI Advisor! Here's what I can do:\n\n` +
    `**Match Analysis** - Ask about any match and I'll break down the probabilities, xG data, and best picks.\n\n` +
    `**Today's Picks** - Say "today's picks" to see picks for today only. Say "tomorrow's picks" for tomorrow.\n\n` +
    `**Daily Picks** - Say "top picks" or "daily picks" to see my strongest recommendations.\n\n` +
    `**Market Explanations** - New to betting? Ask me to explain any market like "what is BTTS?" or "how does Over/Under work?"\n\n` +
    `**Safe Picks** - Want low-risk options? Ask for "safe picks" or "bankers".\n\n` +
    `**Value Picks** - Looking for higher odds? Ask for "value picks" or "longshots".\n\n` +
    `**Live Matches** - Say "live" to see what's happening right now.\n\n` +
    `**Team Search** - Just type a team name and I'll find their upcoming or recent matches.\n\n` +
    `Try asking: "What are your top 3 picks today?" or "Analyze Arsenal vs Chelsea"`;
}

function generateDailyPicksResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent);
  const dateLabel = dateIntent !== "all" ? getDateLabel(dateIntent) : "today";
  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const live = filtered.filter(p => p.status === "IN_PLAY");
  const available = [...live, ...scheduled];

  if (available.length === 0) {
    const finished = filtered.filter(p => p.status === "FINISHED");
    if (finished.length > 0) {
      return `No upcoming matches ${dateLabel}, but here's a recap of ${dateLabel}'s results:\n\n` +
        finished.slice(0, 5).map((p, i) => {
          const score = p.score?.fullTime.home !== null ? `${p.score!.fullTime.home}-${p.score!.fullTime.away}` : "N/A";
          return `${i + 1}. **${p.homeTeam} ${score} ${p.awayTeam}** (${p.competition})`;
        }).join("\n");
    }
    if (dateIntent === "today") {
      const tomorrowPreds = filterByDate(predictions, "tomorrow");
      const tScheduled = tomorrowPreds.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
      if (tScheduled.length > 0) {
        return `No matches scheduled for today. But there are **${tScheduled.length} matches tomorrow**! Ask me for "tomorrow's picks" to see them.`;
      }
    }
    return `There are no matches ${dateLabel}. Check back later for fresh predictions!`;
  }

  const sorted = [...available].sort((a, b) => {
    const aConf = Math.max(...(a.markets || []).map(m => m.confidence), 0);
    const bConf = Math.max(...(b.markets || []).map(m => m.confidence), 0);
    return bConf - aConf;
  });

  const topPicks = sorted.slice(0, 5);

  const today = getTodayString();
  let msg = `Here are my **top picks for ${dateLabel}** (${today}), ranked by confidence:\n\n`;

  topPicks.forEach((p, i) => {
    const sortedMarkets = [...(p.markets || [])].sort((a, b) => b.confidence - a.confidence);
    const topMarket = sortedMarkets[0];
    const kickoff = formatDate(p.matchDate);
    const isLive = p.status === "IN_PLAY";
    const liveScore = isLive && p.score?.fullTime.home !== null ? ` (LIVE: ${p.score!.fullTime.home}-${p.score!.fullTime.away})` : "";

    msg += `**${i + 1}. ${p.homeTeam} vs ${p.awayTeam}**${liveScore} (${p.competition})\n`;
    msg += `   Kickoff: ${isLive ? "LIVE NOW" : kickoff}\n`;
    msg += `   Win Probabilities: Home ${p.homeWinProb}% | Draw ${p.drawProb}% | Away ${p.awayWinProb}%\n`;
    if (topMarket) {
      msg += `   Pick: **${topMarket.market} — ${topMarket.pick}** @ ${topMarket.odds} (${topMarket.confidence}% confidence, ${getConfidenceLabel(topMarket.confidence)})\n\n`;
    } else {
      msg += `   Analysis pending\n\n`;
    }
  });

  msg += `These picks are generated from real league standings, Poisson distribution, Elo ratings, and 10,000 Monte Carlo simulations.\n\n`;
  msg += `Use the **Save as Image** button to save these picks! Want me to dive deeper into any match, or say "give me 20 picks" for more?`;

  return msg;
}

function generateLiveResponse(predictions: MatchPrediction[]): string {
  const live = predictions.filter(p => p.status === "IN_PLAY");
  if (live.length === 0) return `No matches are live right now. Check back closer to kickoff times for live updates!`;

  let msg = `**LIVE MATCHES:**\n\n`;
  live.forEach(p => {
    const score = p.score?.fullTime.home !== null ? `${p.score!.fullTime.home}-${p.score!.fullTime.away}` : "In Play";
    const ht = p.score?.halfTime?.home !== null ? ` (HT: ${p.score!.halfTime!.home}-${p.score!.halfTime!.away})` : "";
    msg += `**${p.homeTeam} ${score} ${p.awayTeam}**${ht} — ${p.competition}\n`;
    msg += `Pre-match odds: Home ${p.homeWinProb}% | Draw ${p.drawProb}% | Away ${p.awayWinProb}%\n\n`;
  });

  return msg;
}

function generateResultsResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent !== "all" ? dateIntent : "today");
  const finished = filtered.filter(p => p.status === "FINISHED");
  const dateLabel = dateIntent !== "all" ? getDateLabel(dateIntent) : "today";

  if (finished.length === 0) return `No completed matches ${dateLabel} yet. Check back after kickoff times!`;

  let msg = `**Results for ${dateLabel}:**\n\n`;
  finished.slice(0, 10).forEach(p => {
    const score = p.score?.fullTime.home !== null ? `${p.score!.fullTime.home}-${p.score!.fullTime.away}` : "FT";
    const ht = p.score?.halfTime?.home !== null ? ` (HT: ${p.score!.halfTime!.home}-${p.score!.halfTime!.away})` : "";
    msg += `**${p.homeTeam} ${score} ${p.awayTeam}**${ht} — ${p.competition}\n`;

    const topPick = p.markets?.[0];
    if (topPick) {
      msg += `Our top pick was: ${topPick.market} — ${topPick.pick} (${topPick.confidence}%)\n\n`;
    } else {
      msg += `\n`;
    }
  });

  return msg;
}

function generateMatchAnalysis(p: MatchPrediction): string {
  const isFinished = p.status === "FINISHED";
  const isLive = p.status === "IN_PLAY";

  let msg = `**${p.homeTeam} vs ${p.awayTeam}**\n`;
  msg += `${p.competition} | ${getMatchDayLabel(p.matchDate)}, ${formatDate(p.matchDate)}`;

  if (isFinished && p.score?.fullTime.home !== null) {
    msg += ` | **FT: ${p.score!.fullTime.home}-${p.score!.fullTime.away}**`;
    if (p.score?.halfTime?.home !== null) msg += ` (HT: ${p.score!.halfTime!.home}-${p.score!.halfTime!.away})`;
  } else if (isLive && p.score?.fullTime.home !== null) {
    msg += ` | **LIVE: ${p.score!.fullTime.home}-${p.score!.fullTime.away}**`;
  }
  msg += `\n\n`;

  msg += `**Win Probabilities:**\n`;
  msg += `- ${p.homeTeam}: ${p.homeWinProb}%\n`;
  msg += `- Draw: ${p.drawProb}%\n`;
  msg += `- ${p.awayTeam}: ${p.awayWinProb}%\n\n`;

  msg += `**Overall Confidence:** ${p.overallConfidence}\n\n`;

  if (p.aiSummary) {
    msg += p.aiSummary + "\n\n";
  }

  if (!isFinished && p.markets && p.markets.length > 0) {
    msg += `**All Available Markets:**\n`;
    p.markets.slice(0, 10).forEach((m, i) => {
      msg += `${i + 1}. **${m.market}:** ${m.pick} (${m.confidence}% — ${getConfidenceLabel(m.confidence)}) @ ${m.odds}\n`;
    });
    msg += `\nWant more detail on any specific market?`;
  } else {
    msg += `This match has finished. Check the results above to see how our predictions performed!`;
  }

  return msg;
}

function generateBTTSResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent);
  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const dateLabel = dateIntent !== "all" ? ` ${getDateLabel(dateIntent)}` : "";

  const bttsMatches = scheduled.map(p => {
    const bttsMarket = (p.markets || []).find(m => m.market === "BTTS (GG/NG)");
    return { prediction: p, bttsMarket };
  }).filter(x => x.bttsMarket && x.bttsMarket.pick === "Yes (GG)")
    .sort((a, b) => (b.bttsMarket?.confidence || 0) - (a.bttsMarket?.confidence || 0));

  if (bttsMatches.length === 0) return `I couldn't find any strong BTTS picks${dateLabel}. This could mean most matches favor defensive setups.`;

  let msg = `**Best BTTS (Both Teams to Score) Picks${dateLabel}:**\n\n`;
  msg += `BTTS means you're betting that both teams will score at least one goal. "GG" = yes, "NG" = no.\n\n`;

  bttsMatches.slice(0, 5).forEach((x, i) => {
    const p = x.prediction;
    const m = x.bttsMarket!;
    msg += `${i + 1}. **${p.homeTeam} vs ${p.awayTeam}** (${p.competition})\n`;
    msg += `   BTTS: Yes @ ${m.odds} — ${m.confidence}% confidence (${getConfidenceLabel(m.confidence)})\n`;
    msg += `   Kickoff: ${getMatchDayLabel(p.matchDate)}, ${formatDate(p.matchDate)}\n\n`;
  });

  msg += `Based on real goals-per-game data and Poisson xG analysis.`;

  return msg;
}

function generateOverUnderResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent);
  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const dateLabel = dateIntent !== "all" ? ` ${getDateLabel(dateIntent)}` : "";

  const overMatches = scheduled.map(p => {
    const ouMarket = (p.markets || []).find(m => m.market === "Over/Under 2.5");
    return { prediction: p, ouMarket };
  }).filter(x => x.ouMarket)
    .sort((a, b) => (b.ouMarket?.confidence || 0) - (a.ouMarket?.confidence || 0));

  if (overMatches.length === 0) return `No Over/Under picks available${dateLabel}.`;

  let msg = `**Over/Under 2.5 Goals Analysis${dateLabel}:**\n\n`;
  msg += `"Over 2.5" = 3+ goals. "Under 2.5" = 2 or fewer goals.\n\n`;

  overMatches.slice(0, 5).forEach((x, i) => {
    const p = x.prediction;
    const m = x.ouMarket!;
    msg += `${i + 1}. **${p.homeTeam} vs ${p.awayTeam}** (${p.competition})\n`;
    msg += `   ${m.pick} @ ${m.odds} — ${m.confidence}% confidence (${getConfidenceLabel(m.confidence)})\n`;
    msg += `   Kickoff: ${getMatchDayLabel(p.matchDate)}, ${formatDate(p.matchDate)}\n\n`;
  });

  return msg;
}

function generateSafePicksResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent);
  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const dateLabel = dateIntent !== "all" ? ` ${getDateLabel(dateIntent)}` : "";

  const safePicks = scheduled.map(p => {
    const dcMarket = (p.markets || []).find(m => m.market === "Double Chance");
    const ou15 = (p.markets || []).find(m => m.market === "Over/Under 1.5" && m.pick.includes("Over"));
    const safest = [dcMarket, ou15].filter(Boolean).sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0));
    return { prediction: p, market: safest[0] };
  }).filter(x => x.market && x.market.confidence >= 65)
    .sort((a, b) => (b.market?.confidence || 0) - (a.market?.confidence || 0));

  if (safePicks.length === 0) return `No particularly safe picks stand out${dateLabel}. The matches look quite balanced.`;

  let msg = `**Safe Picks (Low Risk)${dateLabel}:**\n\n`;
  msg += `These are picks with high confidence — lower odds but more likely to win.\n\n`;

  safePicks.slice(0, 5).forEach((x, i) => {
    const p = x.prediction;
    const m = x.market!;
    msg += `${i + 1}. **${p.homeTeam} vs ${p.awayTeam}** (${p.competition})\n`;
    msg += `   ${m.market}: ${m.pick} @ ${m.odds} — ${m.confidence}% confidence (${getConfidenceLabel(m.confidence)})\n`;
    msg += `   Kickoff: ${getMatchDayLabel(p.matchDate)}, ${formatDate(p.matchDate)}\n\n`;
  });

  msg += `Lower odds = lower risk but lower returns. Good for accumulators or bankroll building.`;

  return msg;
}

function generateValuePicksResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent);
  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const dateLabel = dateIntent !== "all" ? ` ${getDateLabel(dateIntent)}` : "";

  const valuePicks = scheduled.flatMap(p =>
    (p.markets || []).filter(m => {
      const odds = parseFloat(m.odds);
      return odds >= 2.5 && m.confidence >= 35;
    }).map(m => ({ prediction: p, market: m }))
  ).sort((a, b) => {
    const aValue = a.market.confidence * parseFloat(a.market.odds);
    const bValue = b.market.confidence * parseFloat(b.market.odds);
    return bValue - aValue;
  });

  if (valuePicks.length === 0) return `No standout value picks${dateLabel}. The odds don't offer great value right now.`;

  let msg = `**Value Picks (Higher Odds)${dateLabel}:**\n\n`;
  msg += `Higher risk, higher reward!\n\n`;

  valuePicks.slice(0, 5).forEach((x, i) => {
    const p = x.prediction;
    const m = x.market;
    msg += `${i + 1}. **${p.homeTeam} vs ${p.awayTeam}** (${p.competition})\n`;
    msg += `   ${m.market}: ${m.pick} @ ${m.odds} — ${m.confidence}% confidence\n`;
    msg += `   Kickoff: ${getMatchDayLabel(p.matchDate)}, ${formatDate(p.matchDate)}\n\n`;
  });

  msg += `Value picks = odds are better than the actual probability suggests. Consider smaller stakes.`;

  return msg;
}

function generateHighConfidenceResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent);
  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const dateLabel = dateIntent !== "all" ? ` ${getDateLabel(dateIntent)}` : "";

  const highConf = scheduled.flatMap(p =>
    (p.markets || []).slice(0, 3).map(m => ({ prediction: p, market: m }))
  ).filter(x => x.market.confidence >= 65)
    .sort((a, b) => b.market.confidence - a.market.confidence);

  if (highConf.length === 0) return `No very high confidence picks${dateLabel}. The matches are quite unpredictable.`;

  let msg = `**Highest Confidence Picks${dateLabel}:**\n\n`;

  highConf.slice(0, 6).forEach((x, i) => {
    const p = x.prediction;
    const m = x.market;
    msg += `${i + 1}. **${p.homeTeam} vs ${p.awayTeam}** — ${p.competition}\n`;
    msg += `   ${m.market}: ${m.pick} @ ${m.odds} — **${m.confidence}% confidence**\n\n`;
  });

  msg += `These are our statistically strongest picks based on 10,000 Monte Carlo simulations and real league data.`;

  return msg;
}

function generateUpcomingResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent);
  const dateLabel = dateIntent !== "all" ? getDateLabel(dateIntent) : "";

  const live = filtered.filter(p => p.status === "IN_PLAY");
  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const finished = filtered.filter(p => p.status === "FINISHED");

  if (live.length === 0 && scheduled.length === 0 && finished.length === 0) {
    if (dateIntent === "today") {
      const tomorrow = filterByDate(predictions, "tomorrow");
      const tScheduled = tomorrow.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
      if (tScheduled.length > 0) {
        return `No matches today! But there are **${tScheduled.length} matches tomorrow**. Ask me for "tomorrow's picks" to see them.`;
      }
    }
    return `No matches ${dateLabel || "in the current window"}. Check back for new fixtures!`;
  }

  const today = getTodayString();
  let msg = `**Matches ${dateLabel ? "for " + dateLabel : ""} — ${today}:**\n\n`;

  if (live.length > 0) {
    msg += `**LIVE NOW:**\n`;
    live.forEach(p => {
      const score = p.score?.fullTime.home !== null ? `${p.score!.fullTime.home}-${p.score!.fullTime.away}` : "In Play";
      msg += `- **${p.homeTeam} ${score} ${p.awayTeam}** (${p.competition})\n`;
    });
    msg += `\n`;
  }

  if (scheduled.length > 0) {
    const sorted = [...scheduled].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    msg += `**Upcoming (${scheduled.length} matches):**\n\n`;

    sorted.slice(0, 15).forEach((p, i) => {
      const sortedMarkets = [...(p.markets || [])].sort((a, b) => b.confidence - a.confidence);
      const topPick = sortedMarkets[0];
      msg += `**${i + 1}. ${p.homeTeam} vs ${p.awayTeam}** — ${p.competition}\n`;
      msg += `   Kickoff: ${formatDate(p.matchDate)}\n`;
      msg += `   Home ${p.homeWinProb}% | Draw ${p.drawProb}% | Away ${p.awayWinProb}%\n`;
      if (topPick) {
        msg += `   **Pick: ${topPick.market} — ${topPick.pick}** @ ${topPick.odds} (${topPick.confidence}%)\n`;
      }
      msg += `\n`;
    });

    if (sorted.length > 15) msg += `...and ${sorted.length - 15} more matches.\n\n`;
  }

  if (finished.length > 0) {
    msg += `**Completed (${finished.length} matches):**\n`;
    finished.slice(0, 10).forEach((p, i) => {
      const score = p.score?.fullTime.home !== null ? `${p.score!.fullTime.home}-${p.score!.fullTime.away}` : "FT";
      msg += `${i + 1}. **${p.homeTeam} ${score} ${p.awayTeam}** (${p.competition})\n`;
    });
    msg += `\n`;
  }

  msg += `Ask me for picks, analysis on any match, or say "give me 10 picks" for a quick betslip!`;

  return msg;
}

function generateLeagueResponse(predictions: MatchPrediction[], query: string): string {
  const q = query.toLowerCase();
  let leagueName = "";

  if (q.includes("premier")) leagueName = "Premier League";
  else if (q.includes("la liga") || q.includes("laliga")) leagueName = "La Liga";
  else if (q.includes("serie a")) leagueName = "Serie A";
  else if (q.includes("bundesliga")) leagueName = "Bundesliga";
  else if (q.includes("ligue 1") || q.includes("ligue1")) leagueName = "Ligue 1";
  else if (q.includes("champions")) leagueName = "Champions League";
  else if (q.includes("europa")) leagueName = "Europa League";

  const leagueMatches = predictions.filter(p => p.competition.toLowerCase().includes(leagueName.toLowerCase()));

  if (leagueMatches.length === 0) return `No ${leagueName || "matches for that league"} found in the current fixture window.`;

  let msg = `**${leagueName} Matches:**\n\n`;

  leagueMatches.forEach(p => {
    const dayLabel = getMatchDayLabel(p.matchDate);
    const status = p.status === "FINISHED" && p.score?.fullTime.home !== null
      ? `FT: ${p.score!.fullTime.home}-${p.score!.fullTime.away}`
      : p.status === "IN_PLAY" && p.score?.fullTime.home !== null
        ? `LIVE: ${p.score!.fullTime.home}-${p.score!.fullTime.away}`
        : `${dayLabel}, ${formatDate(p.matchDate)}`;

    msg += `**${p.homeTeam} vs ${p.awayTeam}** | ${status}\n`;
    msg += `Home ${p.homeWinProb}% | Draw ${p.drawProb}% | Away ${p.awayWinProb}% | Confidence: ${p.overallConfidence}\n`;
    const topPick = p.markets?.[0];
    if (topPick && p.status !== "FINISHED") {
      msg += `Top pick: ${topPick.market} — ${topPick.pick} (${topPick.confidence}%)\n`;
    }
    msg += `\n`;
  });

  return msg;
}

function generateCleanSheetResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent);
  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const dateLabel = dateIntent !== "all" ? ` ${getDateLabel(dateIntent)}` : "";

  let msg = `**Clean Sheet Analysis${dateLabel}:**\n\n`;
  msg += `A clean sheet means a team doesn't concede any goals.\n\n`;

  const csData = scheduled.map(p => {
    const probGap = Math.abs(p.homeWinProb - p.awayWinProb);
    const dominant = p.homeWinProb > p.awayWinProb ? p.homeTeam : p.awayTeam;
    return { prediction: p, probGap, dominant };
  }).filter(x => x.probGap > 20)
    .sort((a, b) => b.probGap - a.probGap);

  if (csData.length === 0) return `No strong clean sheet candidates${dateLabel}. Most matches look fairly even.`;

  csData.slice(0, 5).forEach((x, i) => {
    const p = x.prediction;
    msg += `${i + 1}. **${p.homeTeam} vs ${p.awayTeam}** (${p.competition})\n`;
    msg += `   ${x.dominant} are strong favorites (${Math.max(p.homeWinProb, p.awayWinProb)}%) — good clean sheet candidate\n`;
    msg += `   Kickoff: ${getMatchDayLabel(p.matchDate)}, ${formatDate(p.matchDate)}\n\n`;
  });

  return msg;
}

function generateCorrectScoreResponse(predictions: MatchPrediction[], query: string): string {
  const match = findBestMatch(predictions, query);
  if (!match) {
    const scheduled = predictions.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
    if (scheduled.length === 0) return `No upcoming matches to analyze for correct scores.`;

    let msg = `**Correct Score Predictions (Top Matches):**\n\n`;
    scheduled.slice(0, 3).forEach(p => {
      const csMarket = (p.markets || []).find(m => m.market === "Correct Score");
      if (csMarket) {
        msg += `**${p.homeTeam} vs ${p.awayTeam}**: Most likely score **${csMarket.pick}** (${csMarket.confidence}%)\n`;
      }
    });
    msg += `\nAsk about a specific match for more score predictions!`;
    return msg;
  }

  const csMarket = (match.markets || []).find(m => m.market === "Correct Score");
  let msg = `**Correct Score Analysis: ${match.homeTeam} vs ${match.awayTeam}**\n\n`;
  if (csMarket) {
    msg += `Most likely scoreline: **${csMarket.pick}** (${csMarket.confidence}% probability)\n\n`;
  }
  msg += `Win probabilities: ${match.homeTeam} ${match.homeWinProb}% | Draw ${match.drawProb}% | ${match.awayTeam} ${match.awayWinProb}%\n\n`;
  msg += `Calculated using Poisson distribution based on real goals-per-game data.`;

  return msg;
}

function generateAccumulatorResponse(predictions: MatchPrediction[], dateIntent: DateIntent): string {
  const filtered = filterByDate(predictions, dateIntent);
  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const dateLabel = dateIntent !== "all" ? ` ${getDateLabel(dateIntent)}` : "";

  if (scheduled.length < 3) return `Not enough upcoming matches to build a good accumulator${dateLabel}.`;

  const safePicks = scheduled.flatMap(p =>
    (p.markets || []).filter(m => m.confidence >= 60).slice(0, 1).map(m => ({ prediction: p, market: m }))
  ).sort((a, b) => b.market.confidence - a.market.confidence);

  if (safePicks.length < 3) return `Not enough high-confidence picks to build a reliable accumulator${dateLabel}.`;

  const accaLegs = safePicks.slice(0, 5);
  let combinedOdds = 1;
  accaLegs.forEach(x => { combinedOdds *= parseFloat(x.market.odds); });

  let msg = `**Suggested Accumulator (${accaLegs.length} legs)${dateLabel}:**\n\n`;

  accaLegs.forEach((x, i) => {
    msg += `${i + 1}. **${x.prediction.homeTeam} vs ${x.prediction.awayTeam}** (${x.prediction.competition})\n`;
    msg += `   ${x.market.market}: ${x.market.pick} @ ${x.market.odds} (${x.market.confidence}%)\n\n`;
  });

  msg += `**Combined Odds: ${combinedOdds.toFixed(2)}**\n`;
  msg += `A $10 stake would return **$${(10 * combinedOdds).toFixed(2)}**\n\n`;
  msg += `Accumulators are fun but risky — all legs must win. Consider starting with doubles or trebles.`;

  return msg;
}

function explainMarket(query: string): string {
  const q = query.toLowerCase();

  if (q.includes("1x2") || q.includes("match result") || q.includes("moneyline")) {
    return `**1X2 (Match Result)**\n\nThe simplest bet — pick who wins:\n- **1** = Home team wins\n- **X** = Draw\n- **2** = Away team wins\n\nExample: If Arsenal are playing at home, "1" means Arsenal win.\n\nThis is the most popular market and a great starting point for beginners!`;
  }
  if (q.includes("btts") || q.includes("both teams") || q.includes("gg") || q.includes("ng")) {
    return `**BTTS (Both Teams to Score)**\n\nYou're betting on whether both teams will score at least one goal:\n- **Yes (GG)** = Both teams score (e.g., 1-1, 2-1, 3-2)\n- **No (NG)** = At least one team fails to score (e.g., 1-0, 0-0, 2-0)\n\nGreat for matches between attacking teams or when a strong defense faces weak opposition.`;
  }
  if (q.includes("over") || q.includes("under") || q.includes("o/u") || q.includes("total goals")) {
    return `**Over/Under Goals**\n\nYou're betting on the total number of goals in a match:\n- **Over 2.5** = 3 or more goals total\n- **Under 2.5** = 2 or fewer goals total\n\nOther lines: Over/Under 1.5, 3.5, 4.5\n\nThe ".5" means there's no push — it's always a clear win or loss. Over 2.5 is the most popular line.`;
  }
  if (q.includes("double chance")) {
    return `**Double Chance**\n\nCovers two of the three possible outcomes:\n- **1X** = Home win OR draw\n- **X2** = Away win OR draw\n- **12** = Home win OR away win (no draw)\n\nLower odds but much safer — great for building accumulators or when you want more security.`;
  }
  if (q.includes("handicap") || q.includes("asian")) {
    return `**Asian Handicap**\n\nGives one team a virtual head start or deficit:\n- **-0.5** = Team must win (no draw option)\n- **-1.5** = Team must win by 2+ goals\n- **+0.5** = Team wins or draws\n- **+1.5** = Team wins, draws, or loses by only 1 goal\n\nUseful when one team is a heavy favorite and straight win odds are too low.`;
  }
  if (q.includes("correct score") || q.includes("exact score")) {
    return `**Correct Score**\n\nPredict the exact final score of the match (e.g., 2-1, 0-0, 3-2).\n\nThese have high odds because they're hard to predict, but our Poisson model helps identify the most likely scorelines. Good for small-stake, high-reward bets.`;
  }
  if (q.includes("ht/ft") || q.includes("half time") || q.includes("halftime")) {
    return `**HT/FT (Half Time / Full Time)**\n\nPredict the result at both half time AND full time:\n- **Home/Home** = Winning at HT, wins at FT\n- **Draw/Home** = Drawing at HT, home team wins FT\n- **Away/Home** = Losing at HT, home team comes back to win\n\nHigher odds because you need to be right twice. Great for matches with strong favorites.`;
  }

  return `I can explain these markets:\n\n- **1X2** - Match result (home/draw/away)\n- **BTTS** - Both teams to score\n- **Over/Under** - Total goals in match\n- **Double Chance** - Two outcomes covered\n- **Asian Handicap** - Virtual head start\n- **Correct Score** - Exact scoreline\n- **HT/FT** - Half time and full time result\n\nJust ask "what is [market name]?" and I'll explain it!`;
}

function generateBulkPicksResponse(predictions: MatchPrediction[], query: string): string {
  const requestedCount = extractPickCount(query) || 10;
  const dateIntent = detectDateIntent(query);
  const filtered = filterByDate(predictions, dateIntent);
  const dateLabel = dateIntent !== "all" ? getDateLabel(dateIntent) : "";

  const scheduled = filtered.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  const live = filtered.filter(p => p.status === "IN_PLAY");
  const available = [...live, ...scheduled];

  if (available.length === 0) {
    const finished = filtered.filter(p => p.status === "FINISHED");
    if (finished.length > 0) {
      let msg = `No upcoming matches ${dateLabel}, but here are the completed results:\n\n`;
      finished.slice(0, 10).forEach((p, i) => {
        const score = p.score?.fullTime.home !== null ? `${p.score!.fullTime.home}-${p.score!.fullTime.away}` : "FT";
        msg += `${i + 1}. **${p.homeTeam} ${score} ${p.awayTeam}** (${p.competition})\n`;
      });
      return msg;
    }
    if (dateIntent === "today") {
      const allScheduled = predictions.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
      if (allScheduled.length > 0) {
        return `No matches today for picks. But there are **${allScheduled.length} upcoming matches** in the coming days. Try "tomorrow's picks" or just "give me picks" without a date filter.`;
      }
    }
    return `No matches available ${dateLabel}. Check back later for new fixtures and picks!`;
  }

  const allPicks = available.flatMap(p =>
    [...(p.markets || [])].sort((a, b) => b.confidence - a.confidence).slice(0, 2).map(m => ({ prediction: p, market: m }))
  ).sort((a, b) => b.market.confidence - a.market.confidence);

  const seen = new Set<number>();
  const uniquePicks: typeof allPicks = [];
  for (const pick of allPicks) {
    if (!seen.has(pick.prediction.matchId)) {
      seen.add(pick.prediction.matchId);
      uniquePicks.push(pick);
    }
    if (uniquePicks.length >= requestedCount) break;
  }

  if (uniquePicks.length === 0) return `I have matches loaded but no strong picks to recommend ${dateLabel}. Try asking about a specific team or league!`;

  let combinedOdds = 1;
  uniquePicks.forEach(x => { combinedOdds *= parseFloat(x.market.odds) || 1; });

  const today = getTodayString();
  let msg = `Here are **${uniquePicks.length} picks${dateLabel ? " for " + dateLabel : ""}** (${today}):\n\n`;

  uniquePicks.forEach((x, i) => {
    const p = x.prediction;
    const m = x.market;
    const dayLabel = getMatchDayLabel(p.matchDate);
    const kickoff = formatDate(p.matchDate);
    const isLive = p.status === "IN_PLAY";
    const score = isLive && p.score?.fullTime.home !== null ? ` (LIVE: ${p.score!.fullTime.home}-${p.score!.fullTime.away})` : "";
    msg += `**${i + 1}. ${p.homeTeam} vs ${p.awayTeam}**${score}\n`;
    msg += `   ${p.competition} | ${isLive ? "LIVE" : `${dayLabel}, ${kickoff}`}\n`;
    msg += `   Pick: **${m.market} — ${m.pick}** @ ${m.odds} (${m.confidence}% confidence)\n\n`;
  });

  msg += `---\n`;
  msg += `**Betslip Summary:** ${uniquePicks.length} selections\n`;
  msg += `**Combined Odds:** ${combinedOdds.toFixed(2)}\n`;
  msg += `**Potential Return (on $10):** $${(10 * combinedOdds).toFixed(2)}\n\n`;
  msg += `Use the **Save as Image** button below to save these picks!\n`;
  msg += `Want me to adjust? I can filter by league, market type, or confidence level.`;

  return msg;
}

function generateGenericMatchResponse(predictions: MatchPrediction[], query: string): string {
  const match = findBestMatch(predictions, query);
  if (match) return generateMatchAnalysis(match);

  const matches = findMatchesByQuery(predictions, query);
  if (matches.length > 0) {
    if (matches.length === 1) return generateMatchAnalysis(matches[0]);

    let msg = `I found ${matches.length} matches related to your search:\n\n`;
    matches.slice(0, 5).forEach((p, i) => {
      const dayLabel = getMatchDayLabel(p.matchDate);
      const status = p.status === "FINISHED" && p.score?.fullTime.home !== null
        ? `FT: ${p.score!.fullTime.home}-${p.score!.fullTime.away}`
        : p.status === "IN_PLAY"
          ? "LIVE"
          : `${dayLabel}, ${formatDate(p.matchDate)}`;

      msg += `${i + 1}. **${p.homeTeam} vs ${p.awayTeam}** — ${p.competition} | ${status}\n`;
      msg += `   Home ${p.homeWinProb}% | Draw ${p.drawProb}% | Away ${p.awayWinProb}%\n`;
      const top = p.markets?.[0];
      if (top && p.status !== "FINISHED") msg += `   Top pick: ${top.market}: ${top.pick} (${top.confidence}%)\n`;
      msg += `\n`;
    });
    msg += `Ask about any specific match for a detailed breakdown!`;
    return msg;
  }

  const todayPreds = filterByDate(predictions, "today");
  const scheduled = todayPreds.filter(p => p.status === "SCHEDULED" || p.status === "TIMED");
  if (scheduled.length > 0) {
    let msg = `I couldn't find a specific match for "${query}", but here are today's fixtures:\n\n`;
    scheduled.slice(0, 5).forEach((p, i) => {
      const top = p.markets?.[0];
      msg += `${i + 1}. **${p.homeTeam} vs ${p.awayTeam}** (${p.competition})\n`;
      msg += `   Home ${p.homeWinProb}% | Draw ${p.drawProb}% | Away ${p.awayWinProb}%\n`;
      if (top) msg += `   Top pick: ${top.pick} (${top.confidence}%)\n`;
      msg += `\n`;
    });
    msg += `Try searching by team name, league name, or ask for "top picks"!`;
    return msg;
  }

  return `I don't have match data for that specific query right now. Try asking about:\n- Today's top picks\n- A specific team (e.g., "Arsenal")\n- A league (e.g., "Premier League")\n- Market explanations (e.g., "what is BTTS?")\n\nOr just say "help" to see everything I can do!`;
}

// ============================================
// MAIN EXPORT
// ============================================

export function generateAIResponse(
  query: string,
  predictions: MatchPrediction[],
  _chatHistory: ChatMessage[]
): string {
  const intent = detectIntent(query);
  const dateIntent = detectDateIntent(query);

  switch (intent) {
    case "greeting":
      return generateGreeting(predictions);
    case "help":
      return generateHelp();
    case "daily_picks":
      return generateDailyPicksResponse(predictions, dateIntent !== "all" ? dateIntent : "today");
    case "live":
      return generateLiveResponse(predictions);
    case "results":
      return generateResultsResponse(predictions, dateIntent);
    case "btts":
      return generateBTTSResponse(predictions, dateIntent);
    case "over_under":
      return generateOverUnderResponse(predictions, dateIntent);
    case "safe_picks":
      return generateSafePicksResponse(predictions, dateIntent);
    case "value_picks":
      return generateValuePicksResponse(predictions, dateIntent);
    case "high_confidence":
      return generateHighConfidenceResponse(predictions, dateIntent);
    case "upcoming":
      return generateUpcomingResponse(predictions, dateIntent !== "all" ? dateIntent : "today");
    case "league_specific":
      return generateLeagueResponse(predictions, query);
    case "explain_market":
    case "explain_betting":
      return explainMarket(query);
    case "clean_sheet":
      return generateCleanSheetResponse(predictions, dateIntent);
    case "correct_score":
      return generateCorrectScoreResponse(predictions, query);
    case "accumulator":
      return generateAccumulatorResponse(predictions, dateIntent);
    case "bulk_picks":
      return generateBulkPicksResponse(predictions, query);
    case "compare":
    case "match_query":
    default:
      return generateGenericMatchResponse(predictions, query);
  }
}
