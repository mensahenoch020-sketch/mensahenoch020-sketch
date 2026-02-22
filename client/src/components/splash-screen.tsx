import { useState, useEffect } from "react";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"enter" | "glow" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("glow"), 400);
    const t2 = setTimeout(() => setPhase("exit"), 1800);
    const t3 = setTimeout(() => onComplete(), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#070c15] transition-opacity duration-500 ${phase === "exit" ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      data-testid="splash-screen"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full transition-all duration-1000 ${phase === "enter" ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
          style={{ background: "radial-gradient(circle, rgba(0,255,163,0.08) 0%, rgba(0,255,163,0.02) 40%, transparent 70%)" }}
        />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full transition-all duration-700 delay-200 ${phase === "enter" ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
          style={{ background: "radial-gradient(circle, rgba(0,255,163,0.12) 0%, transparent 60%)" }}
        />
      </div>

      <div className={`relative flex flex-col items-center gap-5 transition-all duration-700 ${phase === "enter" ? "scale-75 opacity-0 translate-y-4" : "scale-100 opacity-100 translate-y-0"}`}>
        <div className="relative">
          <div className={`absolute inset-0 rounded-2xl transition-all duration-1000 ${phase === "glow" || phase === "exit" ? "opacity-100" : "opacity-0"}`}
            style={{ boxShadow: "0 0 60px 20px rgba(0,255,163,0.15), 0 0 120px 40px rgba(0,255,163,0.05)" }}
          />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00FFA3]/20 to-[#00FFA3]/5 border border-[#00FFA3]/30 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L26 14H34L28 22L30 32L20 26L10 32L12 22L6 14H14L20 4Z" fill="#00FFA3" opacity="0.9" />
              <circle cx="20" cy="20" r="7" fill="#070c15" />
              <circle cx="20" cy="20" r="4" fill="#00FFA3" opacity="0.6" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-display font-black tracking-tight">
            <span className="text-white">Odds</span>
            <span className="text-[#00FFA3]">Aura</span>
          </h1>
          <p className={`text-xs text-white/40 mt-1.5 tracking-widest uppercase transition-all duration-500 delay-300 ${phase === "enter" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
            AI Football Predictions
          </p>
        </div>

        <div className={`flex items-center gap-1.5 mt-3 transition-all duration-500 delay-500 ${phase === "enter" ? "opacity-0" : "opacity-100"}`}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#00FFA3]"
              style={{
                animation: `splashPulse 1s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splashPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
