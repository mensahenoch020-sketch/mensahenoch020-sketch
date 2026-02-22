import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mail, MessageCircle, Globe, Clock, Zap, Shield, Heart } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white" data-testid="text-contact-title">Contact Us</h1>
          <p className="text-sm text-white/50">Get in touch with the OddsAura team</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6 hover:border-[#00FFA3]/30 transition-all group" data-testid="card-email">
          <div className="w-12 h-12 rounded-2xl bg-[#00FFA3]/10 border border-[#00FFA3]/20 flex items-center justify-center mb-4 group-hover:bg-[#00FFA3]/20 transition-all">
            <Mail className="w-6 h-6 text-[#00FFA3]" />
          </div>
          <h3 className="font-display font-bold text-white mb-1">Email Support</h3>
          <p className="text-sm text-white/40 mb-3">For general inquiries and support requests</p>
          <a href="mailto:support@oddsaura.com" className="text-sm font-bold text-[#00FFA3] hover:underline" data-testid="link-email">
            support@oddsaura.com
          </a>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6 hover:border-[#00FFA3]/30 transition-all group" data-testid="card-feedback">
          <div className="w-12 h-12 rounded-2xl bg-[#FFB800]/10 border border-[#FFB800]/20 flex items-center justify-center mb-4 group-hover:bg-[#FFB800]/20 transition-all">
            <MessageCircle className="w-6 h-6 text-[#FFB800]" />
          </div>
          <h3 className="font-display font-bold text-white mb-1">Quick Feedback</h3>
          <p className="text-sm text-white/40 mb-3">Share suggestions or report issues directly</p>
          <Link href="/feedback">
            <span className="text-sm font-bold text-[#FFB800] hover:underline cursor-pointer" data-testid="link-feedback">
              Send Feedback
            </span>
          </Link>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6 hover:border-[#00FFA3]/30 transition-all group" data-testid="card-social">
          <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center mb-4 group-hover:bg-[#8B5CF6]/20 transition-all">
            <Globe className="w-6 h-6 text-[#8B5CF6]" />
          </div>
          <h3 className="font-display font-bold text-white mb-1">Social Media</h3>
          <p className="text-sm text-white/40 mb-3">Follow us for tips and updates</p>
          <span className="text-sm font-bold text-[#8B5CF6]" data-testid="text-social">
            @OddsAura
          </span>
        </Card>

        <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6 hover:border-[#00FFA3]/30 transition-all group" data-testid="card-hours">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-all">
            <Clock className="w-6 h-6 text-white/60" />
          </div>
          <h3 className="font-display font-bold text-white mb-1">Response Time</h3>
          <p className="text-sm text-white/40 mb-3">We aim to reply within 24 hours</p>
          <span className="text-sm font-bold text-white/60" data-testid="text-response-time">
            Mon - Fri, 9am - 6pm UTC
          </span>
        </Card>
      </div>

      <Card className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6 max-w-3xl" data-testid="section-about">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#00FFA3]" />
          <h3 className="font-display font-bold text-white">About OddsAura</h3>
        </div>
        <p className="text-sm text-white/50 leading-relaxed mb-4">
          OddsAura is an AI-powered football prediction platform that combines real-time data from major football leagues with advanced statistical models to deliver comprehensive match analysis and betting insights.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Shield className="w-4 h-4 text-[#00FFA3] flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-white/70">Data Security</p>
              <p className="text-[10px] text-white/30">Your data is encrypted and secure</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Heart className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-white/70">Community Driven</p>
              <p className="text-[10px] text-white/30">Built with user feedback</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Globe className="w-4 h-4 text-[#8B5CF6] flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-white/70">12 Leagues</p>
              <p className="text-[10px] text-white/30">Global coverage</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-[#0d1520] border border-white/10 rounded-xl p-6 max-w-3xl" data-testid="section-disclaimer">
        <h3 className="font-display font-bold text-white mb-3">Disclaimer</h3>
        <p className="text-xs text-white/40 leading-relaxed">
          OddsAura provides AI-generated predictions for informational and entertainment purposes only. Predictions are not guaranteed and should not be treated as financial advice. Always gamble responsibly and within your means. If you or someone you know has a gambling problem, please seek help from a professional organization.
        </p>
      </Card>
    </div>
  );
}
