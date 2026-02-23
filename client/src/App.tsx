import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BetSlipProvider } from "@/lib/bet-slip-context";
import { BetSlip } from "@/components/bet-slip";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import OnboardingTour from "@/components/onboarding-tour";
import { useAuth } from "@/hooks/use-auth";
import { Moon, Sun, Bell, BellOff } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { requestNotificationPermission, canNotify, startLiveMatchMonitoring, startDailyPicksNotification, startFavoriteMatchAlerts, stopAllNotifications } from "@/lib/notifications";
import SplashScreen from "@/components/splash-screen";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import MatchDetail from "@/pages/match-detail";
import AIChat from "@/pages/ai-chat";
import Analytics from "@/pages/analytics";
import DailyPicks from "@/pages/daily-picks";
import PrivacyPolicy from "@/pages/privacy-policy";
import Statistics from "@/pages/statistics";

import Favorites from "@/pages/favorites";
import SharedPicks from "@/pages/shared-picks";
import PickHistory from "@/pages/pick-history";
import PerformanceSummary from "@/pages/performance-summary";
import Leaderboard from "@/pages/leaderboard";
import Settings from "@/pages/settings";
import FeedbackPage from "@/pages/feedback";
import Contact from "@/pages/contact";
import Longshot from "@/pages/longshot";
import Landing from "@/pages/landing";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
      data-testid="button-theme-toggle"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function NotificationToggle() {
  const [enabled, setEnabled] = useState(canNotify());

  const handleToggle = async () => {
    if (enabled) {
      stopAllNotifications();
      setEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    setEnabled(granted);
    if (granted) {
      startDailyPicksNotification();
      try {
        const res = await fetch("/api/favorites");
        if (res.ok) {
          const favs = await res.json();
          const ids = favs.map((f: any) => f.teamId);
          startLiveMatchMonitoring(ids);
          startFavoriteMatchAlerts(ids);
        }
      } catch {}
    }
  };

  useEffect(() => {
    if (canNotify()) {
      startDailyPicksNotification();
      fetch("/api/favorites").then(r => r.json()).then(favs => {
        const ids = favs.map((f: any) => f.teamId);
        startLiveMatchMonitoring(ids);
        startFavoriteMatchAlerts(ids);
      }).catch(() => {});
    }
  }, []);

  return (
    <button
      onClick={handleToggle}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
      data-testid="button-notification-toggle"
      title={enabled ? "Notifications on" : "Enable notifications"}
    >
      {enabled ? <Bell className="w-4 h-4 text-[#00FFA3]" /> : <BellOff className="w-4 h-4" />}
    </button>
  );
}

function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="flex items-center gap-2 p-3 border-b border-[#00FFA3]/10 bg-black/30 dark:bg-black/30 backdrop-blur-sm sticky top-0 z-50">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <NotificationToggle />
        <ThemeToggle />
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="w-7 h-7 rounded-full border border-[#00FFA3]/30" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#00FFA3]/15 border border-[#00FFA3]/30 flex items-center justify-center">
                <span className="text-xs font-bold text-[#00FFA3]">{(user.firstName || user.email || "U").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className="text-xs text-white/70 hidden sm:inline">{user.firstName || user.email}</span>
            <button
              onClick={() => logout()}
              className="text-[10px] text-white/40 hover:text-red-400 transition-colors ml-1"
              data-testid="button-logout"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <a
            href="/api/login"
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#00FFA3] text-black hover:bg-[#00FFA3]/90 transition-colors"
            data-testid="button-login"
          >
            Sign In
          </a>
        )}
        <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse" />
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/match/:id" component={MatchDetail} />
      <Route path="/daily-picks" component={DailyPicks} />
      <Route path="/chat" component={AIChat} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/statistics" component={Statistics} />

      <Route path="/favorites" component={Favorites} />
      <Route path="/shared/:code" component={SharedPicks} />
      <Route path="/pick-history" component={PickHistory} />
      <Route path="/performance-summary" component={PerformanceSummary} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/settings" component={Settings} />
      <Route path="/feedback" component={FeedbackPage} />
      <Route path="/contact" component={Contact} />
      <Route path="/longshot" component={Longshot} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "15rem",
  "--sidebar-width-icon": "3rem",
};

function AppShell() {
  return (
    <BetSlipProvider>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Header />
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
        </div>
        <BetSlip />
      </SidebarProvider>
      <OnboardingTour />
    </BetSlipProvider>
  );
}

function AppContent() {
  const [location] = useLocation();
  const isLanding = location === "/";

  if (isLanding) {
    return <Landing />;
  }

  return <AppShell />;
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("oddsaura-splash-shown");
  });

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem("oddsaura-splash-shown", "true");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
