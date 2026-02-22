const API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const BASE_URL = "https://api.football-data.org/v4";

const headers = {
  "X-Auth-Token": API_KEY,
};

async function fetchAPI(endpoint: string) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Football API error ${res.status}: ${text}`);
    throw new Error(`Football API error: ${res.status}`);
  }
  return res.json();
}

export async function getMatches(dateFrom?: string, dateTo?: string): Promise<any> {
  const today = new Date();
  const from = dateFrom || today.toISOString().split("T")[0];
  const to = dateTo || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return fetchAPI(`/matches?dateFrom=${from}&dateTo=${to}`);
}

export async function getCompetitionMatches(competitionId: number): Promise<any> {
  return fetchAPI(`/competitions/${competitionId}/matches?status=SCHEDULED,IN_PLAY,PAUSED`);
}

export async function getStandings(competitionId: number): Promise<any> {
  return fetchAPI(`/competitions/${competitionId}/standings`);
}

export async function getTeam(teamId: number): Promise<any> {
  return fetchAPI(`/teams/${teamId}`);
}

export async function getHeadToHead(matchId: number): Promise<any> {
  try {
    return await fetchAPI(`/matches/${matchId}/head2head?limit=10`);
  } catch {
    return null;
  }
}

export async function getTeamRecentMatches(teamId: number, limit: number = 5): Promise<any> {
  try {
    const today = new Date();
    const pastDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const from = pastDate.toISOString().split("T")[0];
    const to = today.toISOString().split("T")[0];
    return await fetchAPI(`/teams/${teamId}/matches?dateFrom=${from}&dateTo=${to}&status=FINISHED&limit=${limit}`);
  } catch {
    return null;
  }
}

export async function getMatchDetails(matchId: number): Promise<any> {
  try {
    return await fetchAPI(`/matches/${matchId}`);
  } catch {
    return null;
  }
}

export async function getCompetitions(): Promise<any> {
  return fetchAPI("/competitions");
}

const ALL_COMPETITIONS = [2021, 2014, 2019, 2002, 2015, 2003, 2016, 2017, 2018, 2001, 2013, 2024];

export async function getTopLeagueStandings(): Promise<any[]> {
  const results: any[] = [];
  for (const compId of ALL_COMPETITIONS) {
    try {
      const data = await getStandings(compId);
      if (data?.standings?.[0]?.table) {
        results.push({
          competition: data.competition?.name || `Competition ${compId}`,
          emblem: data.competition?.emblem || "",
          table: data.standings[0].table,
        });
      }
    } catch (err) {
      console.error(`Failed to fetch standings for ${compId}:`, err);
    }
  }
  return results;
}

export function transformMatch(match: any) {
  return {
    id: match.id,
    homeTeam: {
      id: match.homeTeam?.id,
      name: match.homeTeam?.name || "TBD",
      shortName: match.homeTeam?.shortName || match.homeTeam?.name || "TBD",
      crest: match.homeTeam?.crest || "",
    },
    awayTeam: {
      id: match.awayTeam?.id,
      name: match.awayTeam?.name || "TBD",
      shortName: match.awayTeam?.shortName || match.awayTeam?.name || "TBD",
      crest: match.awayTeam?.crest || "",
    },
    utcDate: match.utcDate,
    status: match.status,
    score: match.score || { fullTime: { home: null, away: null }, halfTime: { home: null, away: null } },
    competition: {
      id: match.competition?.id,
      name: match.competition?.name || "Unknown",
      emblem: match.competition?.emblem || "",
    },
    matchday: match.matchday || 0,
  };
}
