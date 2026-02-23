import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { TrendingUp, Brain, BarChart3, Trophy, Star, Zap, ChevronRight, Play } from "lucide-react";

export default function Landing() {
  const [, navigate] = useLocation();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Predictions",
      desc: "Advanced statistical models including Poisson, xG, Elo ratings, and Monte Carlo simulations",
    },
    {
      icon: BarChart3,
      title: "23+ Betting Markets",
      desc: "From 1X2 to BTTS, Over/Under, correct score, and Asian handicaps",
    },
    {
      icon: Trophy,
      title: "Daily Picks & Longshots",
      desc: "Curated top picks and multi-leg accumulators across all leagues",
    },
    {
      icon: Star,
      title: "Live Match Tracking",
      desc: "Real-time scores, timelines, head-to-head stats, and form guides",
    },
    {
      icon: TrendingUp,
      title: "Performance Tracking",
      desc: "Track prediction accuracy, trends, and performance over time",
    },
    {
      icon: Zap,
      title: "AI Chat Advisor",
      desc: "Natural language conversation with real-time match data context",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0f1a] text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-[#0a0f1a] via-[#0d1a2a] to-[#001a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,255,163,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,100,255,0.06)_0%,_transparent_60%)]" />
      </div>

      <div className="relative z-10">
        <nav className="flex items-center justify-between px-6 py-4 md:px-12" data-testid="landing-nav">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00FFA3]/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#00FFA3]" />
            </div>
            <span className="text-xl font-bold tracking-tight font-[Rajdhani]">
              Odds<span className="text-[#00FFA3]">Aura</span>
            </span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-[#00FFA3] text-black transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,163,0.3)]"
            data-testid="button-landing-signin"
          >
            Sign In
          </button>
        </nav>

        <section className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 md:pt-28 md:pb-20 max-w-5xl mx-auto">
          <div
            className={`transition-all duration-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/20 mb-6">
              <Play className="w-3 h-3 text-[#00FFA3]" />
              <span className="text-xs font-medium text-[#00FFA3]">AI-Powered Football Predictions</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 font-[Rajdhani]">
              Predict Smarter.
              <br />
              <span className="text-[#00FFA3]">Win Bigger.</span>
            </h1>

            <p className="text-base md:text-lg text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              Harness the power of advanced statistical models and AI analysis across every football league.
              Get match predictions, daily picks, and real-time insights - all in one platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <button
                onClick={() => navigate("/dashboard")}
                className="group flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-bold bg-[#00FFA3] text-black transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,163,0.4)]"
                data-testid="button-explore-predictions"
              >
                Explore Predictions
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => navigate("/daily-picks")}
                className="flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold border border-white/20 text-white/80 transition-all duration-300 hover:border-[#00FFA3]/40 hover:text-white"
                data-testid="button-view-daily-picks"
              >
                View Daily Picks
              </button>
            </div>
          </div>

          <div
            className={`flex flex-wrap items-center justify-center gap-6 md:gap-10 mt-14 transition-all duration-1000 delay-300 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            {[
              { val: "12+", label: "Leagues" },
              { val: "23+", label: "Markets" },
              { val: "6", label: "AI Models" },
              { val: "24/7", label: "Live Data" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-[#00FFA3] font-[Rajdhani]">{s.val}</div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 md:px-12 max-w-6xl mx-auto">
          <div
            className={`text-center mb-12 transition-all duration-1000 delay-500 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <h2 className="text-2xl md:text-3xl font-bold font-[Rajdhani] mb-3">
              Everything You Need to <span className="text-[#00FFA3]">Make Smarter Picks</span>
            </h2>
            <p className="text-sm text-white/50 max-w-xl mx-auto">
              Powered by real football data, advanced statistics, and artificial intelligence
            </p>
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 transition-all duration-1000 delay-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] transition-all duration-300 hover:border-[#00FFA3]/20 hover:bg-white/[0.05]"
                data-testid={`card-feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#00FFA3]/10 flex items-center justify-center mb-4 group-hover:bg-[#00FFA3]/20 transition-colors">
                  <f.icon className="w-5 h-5 text-[#00FFA3]" />
                </div>
                <h3 className="text-base font-bold mb-2 font-[Rajdhani]">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 text-center">
          <div
            className={`max-w-2xl mx-auto transition-all duration-1000 delay-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <h2 className="text-2xl md:text-3xl font-bold font-[Rajdhani] mb-4">
              Ready to Level Up Your <span className="text-[#00FFA3]">Predictions?</span>
            </h2>
            <p className="text-sm text-white/50 mb-8">
              Join the platform that combines data science with football expertise.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-10 py-4 rounded-full text-base font-bold bg-[#00FFA3] text-black transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,163,0.4)]"
              data-testid="button-get-started"
            >
              Get Started - It's Free
            </button>
          </div>
        </section>

        <footer className="px-6 py-8 border-t border-white/5 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-[#00FFA3]/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#00FFA3]" />
            </div>
            <span className="text-sm font-bold font-[Rajdhani]">
              Odds<span className="text-[#00FFA3]">Aura</span>
            </span>
          </div>
          <p className="text-xs text-white/30">
            AI-powered football predictions. For entertainment purposes only.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <button onClick={() => navigate("/privacy")} className="text-xs text-white/30 hover:text-white/60 transition-colors" data-testid="link-privacy">
              Privacy Policy
            </button>
            <button onClick={() => navigate("/contact")} className="text-xs text-white/30 hover:text-white/60 transition-colors" data-testid="link-contact">
              Contact
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
