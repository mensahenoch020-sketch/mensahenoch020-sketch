import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Bell, BellOff, Moon, Sun, Shield, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/lib/theme-context";
import { canNotify, requestNotificationPermission, stopAllNotifications, startDailyPicksNotification, startLiveMatchMonitoring, startFavoriteMatchAlerts } from "@/lib/notifications";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(canNotify());

  const { data: favorites } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
  });

  const { data: bankroll } = useQuery<any[]>({
    queryKey: ["/api/bankroll"],
  });

  const handleNotificationToggle = async () => {
    if (notificationsEnabled) {
      stopAllNotifications();
      setNotificationsEnabled(false);
      toast({ title: "Notifications disabled" });
      return;
    }
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      startDailyPicksNotification();
      if (favorites) {
        const ids = favorites.map((f: any) => f.teamId);
        startLiveMatchMonitoring(ids);
        startFavoriteMatchAlerts(ids);
      }
      toast({ title: "Notifications enabled!" });
    } else {
      toast({ title: "Permission denied", description: "Please enable notifications in your browser settings." });
    }
  };

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Recently joined";

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white" data-testid="text-settings-title">Settings</h1>
          <p className="text-sm text-white/50">Manage your profile and preferences</p>
        </div>
      </div>

      <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6" data-testid="section-profile">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-[#00FFA3]" />
          <h2 className="font-display font-bold text-white">Profile</h2>
        </div>
        {isAuthenticated && user ? (
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 rounded-2xl border-2 border-[#00FFA3]/30" data-testid="img-profile">
              <AvatarImage src={user.profileImageUrl || undefined} alt="Profile" className="object-cover" />
              <AvatarFallback className="bg-[#00FFA3]/10 text-2xl font-bold text-[#00FFA3] rounded-2xl">
                {(user.firstName || user.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white" data-testid="text-profile-name">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.email || "User"}
              </h3>
              {user.email && <p className="text-sm text-white/50" data-testid="text-profile-email">{user.email}</p>}
              <p className="text-xs text-white/30 mt-1">Member since {memberSince}</p>
            </div>
            <Badge variant="outline" className="border-[#00FFA3]/30 text-[#00FFA3] text-xs">Active</Badge>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
              <User className="w-7 h-7 text-white/30" />
            </div>
            <p className="text-sm text-white/50 mb-4">Sign in to access your profile and personalized features</p>
            <a
              href="/api/login"
              className="inline-flex px-5 py-2.5 rounded-full text-xs font-bold bg-[#00FFA3] text-black hover:bg-[#00FFA3]/90 transition-colors"
              data-testid="button-login-settings"
            >
              Sign In
            </a>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6" data-testid="section-stats">
          <h3 className="font-display font-bold text-white mb-4">Your Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-sm text-white/60">Favorite Teams</span>
              <span className="text-sm font-mono font-bold text-[#00FFA3]">{favorites?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-sm text-white/60">Bets Logged</span>
              <span className="text-sm font-mono font-bold text-[#00FFA3]">{bankroll?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-sm text-white/60">Total Staked</span>
              <span className="text-sm font-mono font-bold text-[#00FFA3]">
                ${bankroll?.reduce((sum: number, e: any) => sum + (parseFloat(e.stake) || 0), 0).toFixed(2) || "0.00"}
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6" data-testid="section-preferences">
          <h3 className="font-display font-bold text-white mb-4">Preferences</h3>
          <div className="space-y-3">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between w-full p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
              data-testid="button-theme-setting"
            >
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="w-4 h-4 text-white/60" /> : <Sun className="w-4 h-4 text-amber-400" />}
                <span className="text-sm text-white/60">Theme</span>
              </div>
              <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                {theme === "dark" ? "Dark" : "Light"}
              </Badge>
            </button>

            <button
              onClick={handleNotificationToggle}
              className="flex items-center justify-between w-full p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
              data-testid="button-notification-setting"
            >
              <div className="flex items-center gap-3">
                {notificationsEnabled ? <Bell className="w-4 h-4 text-[#00FFA3]" /> : <BellOff className="w-4 h-4 text-white/60" />}
                <span className="text-sm text-white/60">Notifications</span>
              </div>
              <Badge variant="outline" className={`text-xs ${notificationsEnabled ? "border-[#00FFA3]/30 text-[#00FFA3]" : "border-white/20 text-white/50"}`}>
                {notificationsEnabled ? "On" : "Off"}
              </Badge>
            </button>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/60">PWA Installed</span>
              </div>
              <Badge variant="outline" className="text-xs border-white/20 text-white/50">
                {window.matchMedia("(display-mode: standalone)").matches ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6" data-testid="section-notifications-detail">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-[#00FFA3]" />
          <h3 className="font-display font-bold text-white">Notification Types</h3>
        </div>
        <p className="text-sm text-white/40 mb-4">When notifications are enabled, you'll receive alerts for:</p>
        <div className="space-y-2">
          {[
            { label: "Goal Alerts", desc: "Get notified when your favorite teams score" },
            { label: "Daily Picks Refresh", desc: "New AI picks available at 6 AM UTC daily" },
            { label: "Match Kickoff", desc: "Reminders 30 minutes before your followed teams play" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notificationsEnabled ? "bg-[#00FFA3]" : "bg-white/20"}`} />
              <div>
                <p className="text-sm font-bold text-white/80">{item.label}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-[#0d1520] border border-white/10 rounded-xl p-6" data-testid="section-about">
        <h3 className="font-display font-bold text-white mb-3">About OddsAura</h3>
        <p className="text-sm text-white/50 leading-relaxed">
          OddsAura uses advanced AI and statistical models — Poisson, xG, Elo ratings, Monte Carlo simulations, Bayesian inference, and Kelly Criterion — to generate predictions across 23+ betting markets for football matches worldwide.
        </p>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
          <span className="text-xs text-white/30">Version 1.0</span>
          <Link href="/privacy">
            <span className="text-xs text-[#00FFA3]/60 hover:text-[#00FFA3] transition-colors cursor-pointer">Privacy Policy</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
