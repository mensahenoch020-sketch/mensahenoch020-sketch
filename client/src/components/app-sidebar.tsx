import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, MessageSquare, BarChart3, Zap, Shield, Star, Activity, Heart, History, TrendingUp, Trophy, User, MessageCircle, Mail, Flame } from "lucide-react";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Daily Picks", url: "/daily-picks", icon: Star },
  { title: "Longshot Acca", url: "/longshot", icon: Flame },
  { title: "Pick History", url: "/pick-history", icon: History },
  { title: "AI Advisor", url: "/chat", icon: MessageSquare },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Statistics", url: "/statistics", icon: Activity },
];

const toolItems = [

  { title: "Performance", url: "/performance-summary", icon: TrendingUp },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Favorite Teams", url: "/favorites", icon: Heart },
];

const otherItems = [
  { title: "Settings", url: "/settings", icon: User },
  { title: "Feedback", url: "/feedback", icon: MessageCircle },
  { title: "Contact", url: "/contact", icon: Mail },
  { title: "Privacy Policy", url: "/privacy", icon: Shield },
];

export function AppSidebar() {
  const [location] = useLocation();

  const renderItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = location === item.url ||
          (item.url !== "/dashboard" && location.startsWith(item.url));
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              className={`transition-all duration-200 ${isActive
                ? "bg-[#00FFA3]/10 text-[#00FFA3] shadow-[inset_3px_0_0_0_#00FFA3] border-l-0"
                : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Link href={item.url}>
                <item.icon className={`w-4 h-4 transition-all duration-200 ${isActive ? "drop-shadow-[0_0_4px_rgba(0,255,163,0.4)]" : ""}`} />
                <span className="font-medium">{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-[#00FFA3]/10">
        <Link href="/dashboard">
          <div className="flex items-center gap-2.5 cursor-pointer group" data-testid="link-logo">
            <div className="w-9 h-9 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center group-hover:bg-[#00FFA3]/20 transition-all duration-200 group-hover:shadow-[0_0_12px_rgba(0,255,163,0.15)]">
              <Zap className="w-5 h-5 text-[#00FFA3]" />
            </div>
            <div>
              <h1 className="text-base font-display font-bold tracking-tight text-white">
                OddsAura
              </h1>
              <p className="text-[10px] text-[#00FFA3]/60 uppercase tracking-widest">AI Predictions</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] text-white/30 uppercase tracking-widest px-4">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderItems(mainItems)}
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] text-white/30 uppercase tracking-widest px-4">Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderItems(toolItems)}
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] text-white/30 uppercase tracking-widest px-4">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderItems(otherItems)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-[#00FFA3]/10">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <div className="w-2 h-2 rounded-full bg-[#00FFA3] animate-pulse" />
          <span>Live Data Connected</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
