import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/">
          <Button size="icon" variant="ghost" className="text-white/60 hover:text-white" data-testid="button-back-privacy">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-display font-bold text-white">Privacy Policy</h1>
      </div>

      <div className="space-y-6 text-white/80 text-sm leading-relaxed">
        <div className="bg-[#0d1520] border border-[#00FFA3]/15 rounded-xl p-6 space-y-4">
          <p className="text-white/50 text-xs">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">1. Information We Collect</h2>
            <p>When you create an account using our sign-in service, we collect your email address, display name, and profile image. We also collect usage data such as prediction views, chat interactions, and betting slip selections to improve our AI models and user experience.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 text-white/70">
              <li>To provide personalized match predictions and AI insights</li>
              <li>To maintain your account and chat history</li>
              <li>To improve our prediction algorithms and AI models</li>
              <li>To communicate important service updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">3. Data Storage & Security</h2>
            <p>Your data is stored securely using industry-standard encryption. We use PostgreSQL databases with encrypted connections. Session data is managed through secure HTTP-only cookies with expiration policies.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">4. Third-Party Services</h2>
            <p>We integrate with the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 text-white/70 mt-1">
              <li>Football Data API - for live match data and statistics</li>
              <li>Replit Authentication - for secure sign-in</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">5. Cookies</h2>
            <p>We use session cookies to maintain your authentication state. These are essential cookies required for the application to function properly.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">6. Your Rights</h2>
            <p>You have the right to access, modify, or delete your personal data at any time. You can delete your account and all associated data by contacting our support team.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">7. Disclaimer</h2>
            <p className="text-amber-400/80">OddsAura provides AI-generated predictions for informational purposes only. We do not guarantee the accuracy of any predictions. Users are solely responsible for their betting decisions. Please gamble responsibly.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">8. Contact</h2>
            <p>For any questions regarding this privacy policy, please reach out through our AI Chat Advisor or contact our support team.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
