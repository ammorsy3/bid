import { BidMonogram } from "@/components/brand/BidLogo";

const STYLE = `
@keyframes ob-drift-a { 0%,100%{transform:translate(-12%,-10%) scale(1)}   50%{transform:translate(14%,12%) scale(1.3)} }
@keyframes ob-drift-b { 0%,100%{transform:translate(10%,14%) scale(1.15)}  50%{transform:translate(-14%,-8%) scale(.85)} }
@keyframes ob-drift-c { 0%,100%{transform:translate(2%,6%) scale(1.05)}    50%{transform:translate(8%,-14%) scale(1.35)} }
@keyframes ob-drift-d { 0%{transform:translate(12%,-12%) scale(1.1)} 33%{transform:translate(-10%,10%) scale(.9)} 66%{transform:translate(6%,14%) scale(1.25)} 100%{transform:translate(12%,-12%) scale(1.1)} }
@keyframes ob-shimmer { 0%{transform:translateX(-130%) rotate(10deg)} 100%{transform:translateX(240%) rotate(10deg)} }
@keyframes ob-card { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
@keyframes ob-dot  { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.25)} }

@media (prefers-reduced-motion: reduce) {
  .ob-anim * { animation: none !important; }
}
`;

export function OnboardingLeftPanelAnimation() {
  return (
    <>
      <style>{STYLE}</style>
      <div className="ob-anim" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-10%", left: "-15%", width: "70%", height: "55%", borderRadius: "50%", filter: "blur(44px)", background: "radial-gradient(circle, rgba(254,60,1,.42) 0%, rgba(254,60,1,0) 68%)", animation: "ob-drift-a 22s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-12%", right: "-18%", width: "75%", height: "58%", borderRadius: "50%", filter: "blur(44px)", background: "radial-gradient(circle, rgba(255,150,40,.36) 0%, rgba(255,150,40,0) 70%)", animation: "ob-drift-b 26s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "28%", left: "20%", width: "60%", height: "50%", borderRadius: "50%", filter: "blur(44px)", background: "radial-gradient(circle, rgba(255,138,91,.34) 0%, rgba(255,138,91,0) 70%)", animation: "ob-drift-c 19s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "8%", right: "-10%", width: "55%", height: "45%", borderRadius: "50%", filter: "blur(44px)", background: "radial-gradient(circle, rgba(255,196,42,.30) 0%, rgba(255,196,42,0) 72%)", animation: "ob-drift-d 30s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "6%", left: "-12%", width: "58%", height: "48%", borderRadius: "50%", filter: "blur(44px)", background: "radial-gradient(circle, rgba(249,217,194,.55) 0%, rgba(249,217,194,0) 72%)", animation: "ob-drift-a 24s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(252,233,220,.25), transparent 75%)" }} />

        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
          <div style={{ position: "relative", overflow: "hidden", width: "100%", maxWidth: 300, background: "rgba(255,255,255,.42)", backdropFilter: "blur(22px) saturate(165%)", WebkitBackdropFilter: "blur(22px) saturate(165%)", border: "1px solid rgba(255,255,255,.6)", borderRadius: 26, padding: "34px 30px 32px", boxShadow: "0 30px 70px -28px rgba(11,9,7,.4), inset 0 1px 0 rgba(255,255,255,.55)", animation: "ob-card 7s ease-in-out infinite", textAlign: "center" }}>
            <div style={{ position: "absolute", top: "-60%", left: 0, width: "45%", height: "220%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)", animation: "ob-shimmer 6.5s ease-in-out infinite", pointerEvents: "none" }} />
            <div style={{ width: 58, height: 58, borderRadius: 18, background: "#F7F1E6", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 30px -10px rgba(11,9,7,.25)", marginBottom: 18 }}>
              <BidMonogram variant="orange" size={32} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.03em", color: "#0B0907", lineHeight: 1.1, marginBottom: 8 }}>Welcome to Bid</h2>
            <p style={{ fontSize: 13.5, color: "#6B625A", lineHeight: 1.5, marginBottom: 18 }}>Sourcing, redefined. Let's get your <br />workspace set up.</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.55)", border: "1px solid rgba(11,9,7,.06)", borderRadius: 999, padding: "6px 14px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0B0907", animation: "ob-dot 2.4s ease-in-out infinite" }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0B0907" }}>Now live</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
