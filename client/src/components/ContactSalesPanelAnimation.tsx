import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ClipboardList, FileText, MessageCircleQuestion, Scale, Trophy } from "lucide-react";
import { BidMonogram } from "@/components/brand/BidLogo";
import { useI18n } from "@/lib/i18n";

// Right-hand panel of /contact-sales. Same drifting-light backdrop as the
// login / sign-up panel (OnboardingLeftPanelAnimation), with the Bid tour as one
// slowly turning orbit of steps around the logo. Click a step to pause and read
// it; click anywhere else to carry on. The Saudi Tech badge sits below as social proof.

const STYLE = `
@keyframes cs-drift-a { 0%,100%{transform:translate(-12%,-10%) scale(1)}   50%{transform:translate(14%,12%) scale(1.3)} }
@keyframes cs-drift-b { 0%,100%{transform:translate(10%,14%) scale(1.15)}  50%{transform:translate(-14%,-8%) scale(.85)} }
@keyframes cs-drift-c { 0%,100%{transform:translate(2%,6%) scale(1.05)}    50%{transform:translate(8%,-14%) scale(1.35)} }
@keyframes cs-ring { 0%{transform:scale(.6);opacity:.55} 100%{transform:scale(1.5);opacity:0} }
@keyframes cs-fade-up { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
@media (prefers-reduced-motion: reduce) { .cs-anim * { animation: none !important; transition: none !important; } }
`;

const GLASS: CSSProperties = {
  background: "rgba(255,255,255,.5)",
  backdropFilter: "blur(22px) saturate(165%)",
  WebkitBackdropFilter: "blur(22px) saturate(165%)",
  border: "1px solid rgba(255,255,255,.65)",
  boxShadow: "0 30px 70px -28px rgba(11,9,7,.4), inset 0 1px 0 rgba(255,255,255,.55)",
};

const CAPTION = { en: "Your personalized Bid Tour", ar: "جولتك التعريفية المخصّصة في Bid" };

const logoTile = (size: number): CSSProperties => ({ width: size, height: size, borderRadius: size * 0.31, background: "#F7F1E6", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 30px -10px rgba(11,9,7,.25)" });

function Backdrop({ children }: { children: ReactNode }) {
  const blob = (style: CSSProperties) => <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(44px)", ...style }} />;
  return (
    <>
      <style>{STYLE}</style>
      <div className="cs-anim" style={{ position: "absolute", inset: 0, overflow: "hidden", background: "radial-gradient(ellipse at 60% 25%, #FCE9DC 0%, #F4EDE1 68%)" }}>
        {blob({ top: "-10%", left: "-15%", width: "70%", height: "55%", background: "radial-gradient(circle, rgba(254,60,1,.42) 0%, rgba(254,60,1,0) 68%)", animation: "cs-drift-a 22s ease-in-out infinite" })}
        {blob({ bottom: "-12%", right: "-18%", width: "75%", height: "58%", background: "radial-gradient(circle, rgba(255,150,40,.36) 0%, rgba(255,150,40,0) 70%)", animation: "cs-drift-b 26s ease-in-out infinite" })}
        {blob({ top: "28%", left: "20%", width: "60%", height: "50%", background: "radial-gradient(circle, rgba(255,138,91,.34) 0%, rgba(255,138,91,0) 70%)", animation: "cs-drift-c 19s ease-in-out infinite" })}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(11,9,7,.45) 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.045 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 32 }}>
          {children}
          <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,.65)", border: "1px solid rgba(11,9,7,.06)", borderRadius: 999, padding: "8px 18px" }}>
            <img src="/saudi-tech-logo.png" alt="Saudi Tech" style={{ height: 28, width: "auto" }} />
          </div>
        </div>
      </div>
    </>
  );
}

function Orbit() {
  const { isRtl } = useI18n();
  const steps = isRtl
    ? [
        { icon: FileText, title: "الطلب", text: "اكتب ما تحتاجه وسيجهّز الذكاء الاصطناعي المناقصة لك." },
        { icon: ClipboardList, title: "العروض", text: "يرسل الموردون عروضهم في مكان واحد وبصيغة موحّدة." },
        { icon: MessageCircleQuestion, title: "الأسئلة", text: "جولات أسئلة وأجوبة منظّمة يراها كل المتقدّمين." },
        { icon: Scale, title: "المقارنة", text: "قارن العروض جنبًا إلى جنب مع تقييم ذكي لكل عرض." },
        { icon: Trophy, title: "الترسية", text: "اختر الأفضل وأرسِ المناقصة بسجلّ واضح للقرار." },
      ]
    : [
        { icon: FileText, title: "Brief", text: "Describe what you need and AI drafts the tender for you." },
        { icon: ClipboardList, title: "Offers", text: "Vendors send their offers to one place, in one format." },
        { icon: MessageCircleQuestion, title: "Q&A", text: "Structured question rounds that every bidder can see." },
        { icon: Scale, title: "Compare", text: "Compare offers side by side, with an AI score for each." },
        { icon: Trophy, title: "Award", text: "Pick the best one and award it, with a clear record of why." },
      ];
  const [active, setActive] = useState<number | null>(null);
  // Turns while nothing is open; stops (keeping its angle) when a step is opened.
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    if (active !== null || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setSpin((d) => (d + ((now - last) / 1000) * 6) % 360);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  const R = 128;
  return (
    <div style={{ position: "relative", width: 420, maxWidth: "100%", height: 400 }} onClick={() => setActive(null)}>
      <div style={{ position: "absolute", top: "37%", left: "50%", width: R * 2, height: R * 2, margin: -R, borderRadius: "50%", border: "1.5px dashed rgba(11,9,7,.16)" }} />
      {[0, 1.4].map((d) => <div key={d} style={{ position: "absolute", top: "37%", left: "50%", width: 96, height: 96, margin: -48, borderRadius: "50%", border: "2px solid rgba(254,60,1,.45)", animation: `cs-ring 3.2s ease-out ${d}s infinite` }} />)}
      <div className="surface-cream" style={{ ...logoTile(76), position: "absolute", top: "37%", left: "50%", margin: -38, borderRadius: 24 }}><BidMonogram variant="orange" size={42} /></div>
      {steps.map((st, i) => {
        const rad = (((i / steps.length) * 360 + spin - 90) * Math.PI) / 180;
        const on = active === i;
        const Icon = st.icon;
        return (
          <button
            key={st.title}
            type="button"
            onClick={(e) => { e.stopPropagation(); setActive(on ? null : i); }}
            style={{ position: "absolute", top: "37%", left: "50%", transform: `translate(${Math.cos(rad) * R}px, ${Math.sin(rad) * R}px) translate(-50%,-50%)`, border: 0, background: "none", padding: 0, cursor: "pointer", zIndex: on ? 5 : 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
            aria-pressed={on}
          >
            <span style={{ width: 44, height: 44, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: on ? "#FE3C01" : "#fff", color: on ? "#fff" : "#0B0907", border: on ? "2px solid #FE3C01" : "2px solid rgba(11,9,7,.12)", boxShadow: on ? "0 12px 28px -8px rgba(254,60,1,.7)" : "0 10px 22px -12px rgba(11,9,7,.4)", transform: on ? "scale(1.18)" : "scale(1)", transition: "all .3s" }}>
              <Icon size={19} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0B0907", background: "rgba(255,255,255,.7)", borderRadius: 99, padding: "2px 9px" }}>{st.title}</span>
          </button>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 92 }}>
        {active === null ? (
          <p style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#FE3C01", paddingTop: 30 }}>{(isRtl ? CAPTION.ar : CAPTION.en)}</p>
        ) : (
          <div key={active} style={{ ...GLASS, borderRadius: 20, padding: "14px 16px", animation: "cs-fade-up .35s ease-out" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0B0907" }}>{steps[active].title}</div>
            <p style={{ fontSize: 12.5, color: "#4a423b", lineHeight: 1.5, marginTop: 4 }}>{steps[active].text}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ContactSalesPanelAnimation() {
  return <Backdrop><Orbit /></Backdrop>;
}
