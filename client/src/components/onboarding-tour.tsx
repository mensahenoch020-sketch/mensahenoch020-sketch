import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles, BarChart3, MessageSquare, Trophy, Star, DollarSign, Flame, Heart, Sun, TrendingUp, History, Award } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: ReactNode;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to OddsAura!",
    description: "Your AI-powered football prediction companion. We use Poisson models, xG analysis, Elo ratings, Monte Carlo simulations, and Bayesian methods to generate predictions for every match.",
    icon: <Sparkles className="w-8 h-8 text-[#00FFA3]" />,
  },
  {
    title: "Match Predictions",
    description: "Browse matches with 23+ betting markets. Each card shows our top 3 picks with confidence levels and odds. Use the date navigator to find matches up to 7 days ahead, and filter by league or LIVE status.",
    icon: <Trophy className="w-8 h-8 text-[#00FFA3]" />,
  },
  {
    title: "Match Detail & Analysis",
    description: "Tap any match for full analysis: all 23 markets, AI summary with xG data, head-to-head history, team form guide, match timeline, and odds comparison across 5 bookmakers.",
    icon: <BarChart3 className="w-8 h-8 text-[#00FFA3]" />,
  },
  {
    title: "Daily Picks",
    description: "Our AI selects the 5 best picks each day at 06:00 UTC. Check the Daily Picks page for today's selections, with confidence meters and detailed reasoning.",
    icon: <Star className="w-8 h-8 text-[#FFB800]" />,
  },
  {
    title: "Longshot Accumulator",
    description: "A daily 25-leg multi-bet across 7+ days and multiple leagues. High risk, massive potential returns. You can add all legs to My Picks at once, or save it as an image to share.",
    icon: <Flame className="w-8 h-8 text-[#FF6B00]" />,
  },
  {
    title: "AI Advisor",
    description: "Chat with our AI assistant about any match. It has access to real-time match data, standings, and form. Ask in plain language and get intelligent analysis with specific stats.",
    icon: <MessageSquare className="w-8 h-8 text-[#00FFA3]" />,
  },
  {
    title: "My Picks & Sharing",
    description: "Tap the '+' button on any prediction to save it. Your picks panel lets you export as a styled image or generate a shareable link. Perfect for sharing tips with friends.",
    icon: <Star className="w-8 h-8 text-[#00FFA3]" />,
  },
  {
    title: "Statistics Dashboard",
    description: "Track prediction accuracy across markets, leagues, and confidence levels. View trends over time and see how our AI models perform.",
    icon: <DollarSign className="w-8 h-8 text-[#00FFA3]" />,
  },
  {
    title: "Favorite Teams",
    description: "Follow your favorite teams by tapping the heart icon on any match detail page. Get a dedicated page showing all upcoming and recent matches for your followed teams.",
    icon: <Heart className="w-8 h-8 text-[#EF4444]" />,
  },
  {
    title: "Statistics & Performance",
    description: "Track AI prediction accuracy with donut charts, market breakdowns, streak tracking, and trend analysis. Check Pick History for archived results and Performance Summary for weekly/monthly recaps.",
    icon: <TrendingUp className="w-8 h-8 text-[#00FFA3]" />,
  },
  {
    title: "Leaderboard & More",
    description: "Compete on the leaderboard by accuracy and ROI. Switch between dark and light themes with the toggle in the header. Enable notifications for goal alerts and daily pick reminders.",
    icon: <Award className="w-8 h-8 text-[#FFB800]" />,
  },
  {
    title: "You're All Set!",
    description: "Explore the sidebar to navigate between all features. OddsAura refreshes predictions daily, so check back often. Good luck, and bet responsibly!",
    icon: <Sun className="w-8 h-8 text-[#00FFA3]" />,
  },
];

export default function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("oddsaura-tour-v2");
    if (!seen) {
      const timer = setTimeout(() => setIsVisible(true), 2800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("oddsaura-tour-v2", "true");
  };

  const handleNext = () => {
    if (step < tourSteps.length - 1) setStep(step + 1);
    else handleClose();
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!isVisible) return null;

  const currentStep = tourSteps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" data-testid="onboarding-overlay">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-[#0d1520] border border-[#00FFA3]/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-[#00FFA3]/5 animate-in fade-in zoom-in duration-300" data-testid="onboarding-modal">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
          data-testid="button-close-tour"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto">
            {currentStep.icon}
          </div>
          <h2 className="text-xl font-display font-bold text-white" data-testid="text-tour-title">{currentStep.title}</h2>
          <p className="text-sm text-white/60 leading-relaxed">{currentStep.description}</p>
        </div>

        <div className="flex items-center justify-between mt-5 text-xs text-white/30">
          <span>{step + 1} of {tourSteps.length}</span>
        </div>

        <div className="flex items-center justify-center gap-1 mt-2">
          {tourSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-[#00FFA3]" : i < step ? "w-2 bg-[#00FFA3]/40" : "w-1.5 bg-white/10"}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-5">
          <Button
            variant="ghost"
            className="text-white/40"
            onClick={handlePrev}
            disabled={step === 0}
            data-testid="button-prev-step"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            className="bg-[#00FFA3] text-black font-bold px-6"
            onClick={handleNext}
            data-testid="button-next-step"
          >
            {step === tourSteps.length - 1 ? "Get Started" : "Next"}
            {step < tourSteps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>

        <button
          onClick={handleClose}
          className="w-full text-center text-xs text-white/20 mt-4 hover:text-white/40 transition-colors"
          data-testid="button-skip-tour"
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}
