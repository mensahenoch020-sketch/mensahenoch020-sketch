import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Star, Bug, Lightbulb, Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FeedbackType = "suggestion" | "bug" | "praise" | "other";

const feedbackTypes: { type: FeedbackType; label: string; icon: any; color: string }[] = [
  { type: "suggestion", label: "Suggestion", icon: Lightbulb, color: "#FFB800" },
  { type: "bug", label: "Bug Report", icon: Bug, color: "#EF4444" },
  { type: "praise", label: "Love it!", icon: Star, color: "#00FFA3" },
  { type: "other", label: "Other", icon: MessageCircle, color: "#8B5CF6" },
];

export default function Feedback() {
  const { toast } = useToast();
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({ title: "Please enter your feedback" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Thank you for your feedback!" });
  };

  if (submitted) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center animate-fadeIn">
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mx-auto mb-5 animate-scaleIn">
            <CheckCircle2 className="w-8 h-8 text-[#00FFA3]" />
          </div>
          <h2 className="text-xl font-display font-bold text-white mb-2">Thank You!</h2>
          <p className="text-sm text-white/50 mb-6">Your feedback has been received. We appreciate you helping us improve OddsAura.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/">
              <Button variant="outline" className="text-xs border-white/20 text-white/70 hover:text-white" data-testid="button-back-home">
                Back to Dashboard
              </Button>
            </Link>
            <Button
              onClick={() => { setSubmitted(false); setMessage(""); setRating(0); }}
              className="text-xs bg-[#00FFA3] text-black hover:bg-[#00FFA3]/90"
              data-testid="button-send-more"
            >
              Send More Feedback
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white" data-testid="text-feedback-title">Feedback</h1>
          <p className="text-sm text-white/50">Help us improve OddsAura</p>
        </div>
      </div>

      <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6 max-w-2xl" data-testid="section-feedback-form">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-white/70 mb-3 block">What type of feedback?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {feedbackTypes.map(ft => (
                <button
                  key={ft.type}
                  type="button"
                  onClick={() => setType(ft.type)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    type === ft.type
                      ? "border-[#00FFA3]/40 bg-[#00FFA3]/5"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                  data-testid={`button-type-${ft.type}`}
                >
                  <ft.icon className="w-5 h-5" style={{ color: ft.color }} />
                  <span className={`text-xs font-bold ${type === ft.type ? "text-white" : "text-white/50"}`}>{ft.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-white/70 mb-3 block">Rate your experience</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-all hover:scale-110"
                  data-testid={`button-star-${star}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${star <= rating ? "fill-[#FFB800] text-[#FFB800]" : "text-white/20"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-white/70 mb-3 block">Your message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={
                type === "bug"
                  ? "Describe what happened and what you expected..."
                  : type === "suggestion"
                  ? "What feature or improvement would you like to see?"
                  : type === "praise"
                  ? "What do you love about OddsAura?"
                  : "Tell us what's on your mind..."
              }
              className="w-full h-36 bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-[#00FFA3]/30 transition-colors"
              data-testid="input-feedback-message"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#00FFA3] text-black font-bold hover:bg-[#00FFA3]/90 transition-all h-11"
            data-testid="button-submit-feedback"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Feedback
          </Button>
        </form>
      </Card>

      <Card className="bg-[#0d1520] border border-white/10 rounded-xl p-6 max-w-2xl" data-testid="section-faq">
        <h3 className="font-display font-bold text-white mb-4">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {[
            { q: "How accurate are the predictions?", a: "Our AI models analyze real-time data and historical statistics. Accuracy varies by market — check the Statistics page for detailed breakdowns." },
            { q: "How often are picks refreshed?", a: "Daily Picks refresh automatically at 6:00 AM UTC every day with fresh AI analysis." },
            { q: "Can I track prediction accuracy?", a: "Yes! Check the Statistics page for detailed accuracy breakdowns by market, league, and confidence level." },
            { q: "What leagues are covered?", a: "We cover 12 major football competitions including Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and more." },
          ].map((faq, i) => (
            <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-sm font-bold text-white/80 mb-1">{faq.q}</p>
              <p className="text-xs text-white/40 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
