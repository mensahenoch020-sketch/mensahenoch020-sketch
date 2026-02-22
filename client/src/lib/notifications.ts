let notificationPermission: NotificationPermission = "default";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") {
    notificationPermission = "granted";
    return true;
  }
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  notificationPermission = result;
  return result === "granted";
}

export function canNotify(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

export async function showNotification(title: string, body: string, options?: { tag?: string; url?: string }) {
  if (!canNotify()) return;

  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) {
      reg.active.postMessage({
        type: "SHOW_NOTIFICATION",
        title,
        body,
        tag: options?.tag || "oddsaura",
        data: { url: options?.url || "/" },
      });
      return;
    }
  }

  new Notification(title, {
    body,
    icon: "/icon-192.png",
    tag: options?.tag || "oddsaura",
  });
}

let liveMatchInterval: ReturnType<typeof setInterval> | null = null;
let knownGoals: Record<number, { home: number; away: number }> = {};

export function startLiveMatchMonitoring(favoriteTeamIds: number[]) {
  if (liveMatchInterval) clearInterval(liveMatchInterval);
  if (favoriteTeamIds.length === 0) return;

  const checkLiveMatches = async () => {
    try {
      const res = await fetch("/api/predictions");
      if (!res.ok) return;
      const predictions = await res.json();

      for (const pred of predictions) {
        if (pred.status !== "IN_PLAY" && pred.status !== "LIVE") continue;

        const isFollowed = favoriteTeamIds.includes(pred.homeTeamId) || favoriteTeamIds.includes(pred.awayTeamId);
        if (!isFollowed) continue;

        const score = pred.score;
        if (!score) continue;

        const homeGoals = score.fullTime?.home ?? score.halfTime?.home ?? null;
        const awayGoals = score.fullTime?.away ?? score.halfTime?.away ?? null;

        if (homeGoals === null || awayGoals === null) continue;

        const prev = knownGoals[pred.matchId];
        const totalGoals = homeGoals + awayGoals;

        if (prev) {
          const prevTotal = prev.home + prev.away;
          if (totalGoals > prevTotal) {
            showNotification(
              "GOAL!",
              `${pred.homeTeam} ${homeGoals} - ${awayGoals} ${pred.awayTeam}`,
              { tag: `goal-${pred.matchId}-${totalGoals}`, url: `/match/${pred.matchId}` }
            );
          }
        }

        knownGoals[pred.matchId] = { home: homeGoals, away: awayGoals };
      }
    } catch {
    }
  };

  checkLiveMatches();
  liveMatchInterval = setInterval(checkLiveMatches, 60000);
}

export function stopLiveMatchMonitoring() {
  if (liveMatchInterval) {
    clearInterval(liveMatchInterval);
    liveMatchInterval = null;
  }
  knownGoals = {};
}

let dailyPicksCheckInterval: ReturnType<typeof setInterval> | null = null;
let lastPickDate = "";

export function startDailyPicksNotification() {
  if (dailyPicksCheckInterval) clearInterval(dailyPicksCheckInterval);

  const checkForNewPicks = async () => {
    try {
      const res = await fetch("/api/daily-picks");
      if (!res.ok) return;
      const data = await res.json();
      if (data.pickDate && data.pickDate !== lastPickDate && lastPickDate !== "") {
        showNotification(
          "Daily Picks Refreshed!",
          `${data.picks?.length || 5} new AI picks are ready for today.`,
          { tag: "daily-picks-refresh", url: "/daily-picks" }
        );
      }
      lastPickDate = data.pickDate || "";
    } catch {
    }
  };

  checkForNewPicks();
  dailyPicksCheckInterval = setInterval(checkForNewPicks, 5 * 60 * 1000);
}

export function stopDailyPicksNotification() {
  if (dailyPicksCheckInterval) {
    clearInterval(dailyPicksCheckInterval);
    dailyPicksCheckInterval = null;
  }
}

let favoriteAlertsInterval: ReturnType<typeof setInterval> | null = null;

export function startFavoriteMatchAlerts(favoriteTeamIds: number[]) {
  if (favoriteAlertsInterval) clearInterval(favoriteAlertsInterval);
  if (favoriteTeamIds.length === 0) return;

  const checkUpcoming = async () => {
    try {
      const res = await fetch("/api/predictions");
      if (!res.ok) return;
      const predictions = await res.json();

      for (const pred of predictions) {
        if (pred.status !== "TIMED" && pred.status !== "SCHEDULED") continue;

        const isFollowed = favoriteTeamIds.includes(pred.homeTeamId) || favoriteTeamIds.includes(pred.awayTeamId);
        if (!isFollowed) continue;

        const matchTime = new Date(pred.matchDate).getTime();
        const now = Date.now();
        const minutesUntil = (matchTime - now) / 60000;

        if (minutesUntil > 0 && minutesUntil <= 30) {
          showNotification(
            "Match Starting Soon!",
            `${pred.homeTeam} vs ${pred.awayTeam} kicks off in ${Math.round(minutesUntil)} minutes`,
            { tag: `upcoming-${pred.matchId}`, url: `/match/${pred.matchId}` }
          );
        }
      }
    } catch {
    }
  };

  checkUpcoming();
  favoriteAlertsInterval = setInterval(checkUpcoming, 10 * 60 * 1000);
}

export function stopFavoriteMatchAlerts() {
  if (favoriteAlertsInterval) {
    clearInterval(favoriteAlertsInterval);
    favoriteAlertsInterval = null;
  }
}

export function stopAllNotifications() {
  stopLiveMatchMonitoring();
  stopDailyPicksNotification();
  stopFavoriteMatchAlerts();
}
