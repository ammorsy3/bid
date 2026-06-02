import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Bell, Users, TrendingUp, CheckCircle2, Clock, ArrowUpRight, Sparkles, Building2, Send } from "lucide-react";

// ── Tiny avatar ────────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 28 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        color: "white",
        flexShrink: 0,
        border: "2px solid white",
      }}
    >
      {initials}
    </div>
  );
}

// ── Pulsing dot ────────────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <motion.span
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "#FE3C01", opacity: 0.4,
        }}
        animate={{ scale: [1, 2.2, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: "#FE3C01", display: "inline-block" }} />
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color, delay = 0,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "white",
        borderRadius: 16,
        padding: "16px 18px",
        flex: 1,
        boxShadow: "0 2px 12px rgba(11,9,7,0.06), 0 1px 3px rgba(11,9,7,0.04)",
        border: "1px solid rgba(11,9,7,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span style={{ fontSize: 10, color: "#8A8078", fontWeight: 500 }}>{sub}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#0B0907", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8A8078", marginTop: 4, fontWeight: 500 }}>{label}</div>
    </motion.div>
  );
}

// ── Notification toast ────────────────────────────────────────────────────────
function NotificationToast({ text, sub, icon, delay }: { text: string; sub: string; icon: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 48, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.92 }}
      transition={{ delay, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "white",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 11,
        boxShadow: "0 8px 28px rgba(11,9,7,0.10), 0 2px 8px rgba(11,9,7,0.06)",
        border: "1px solid rgba(11,9,7,0.06)",
        width: "100%",
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(254,60,1,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#FE3C01" }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0B0907", letterSpacing: "-0.01em" }}>{text}</div>
        <div style={{ fontSize: 11, color: "#8A8078", marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ fontSize: 10, color: "#8A8078", flexShrink: 0 }}>now</div>
    </motion.div>
  );
}

// ── Bid row ───────────────────────────────────────────────────────────────────
function BidRow({ company, amount, score, color, delay }: { company: string; amount: string; score: number; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(11,9,7,0.05)" }}
    >
      <Avatar initials={company.slice(0, 2).toUpperCase()} color={color} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#0B0907", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{company}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <div style={{ height: 3, borderRadius: 999, background: "rgba(11,9,7,0.07)", flex: 1, overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", background: color, borderRadius: 999 }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ delay: delay + 0.15, duration: 0.55, ease: "easeOut" }}
            />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#8A8078", flexShrink: 0 }}>{score}%</span>
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#0B0907", fontFamily: "monospace", flexShrink: 0 }}>{amount}</span>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function OnboardingLeftPanelAnimation() {
  const [tick, setTick] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [bidCount, setBidCount] = useState(3);

  // Cycle notifications every 4s
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 4200);
    return () => clearInterval(t);
  }, []);

  // Show toast after 1.8s, then cycle
  useEffect(() => {
    const show = setTimeout(() => setShowNotif(true), 1800);
    const hide = setTimeout(() => setShowNotif(false), 5000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [tick]);

  // Bid counter increments
  useEffect(() => {
    const t = setTimeout(() => setBidCount((n) => (n < 12 ? n + 1 : 3)), 2800);
    return () => clearTimeout(t);
  }, [tick]);

  const notifications = [
    { text: "New bid submitted", sub: "Al-Rashid Trading · Office Supplies RFP", icon: <Send size={15} /> },
    { text: "Vendor verified", sub: "Saudi Tech Solutions joined your base", icon: <CheckCircle2 size={15} /> },
    { text: "RFP deadline approaching", sub: "IT Infrastructure · 2 days left", icon: <Clock size={15} /> },
    { text: "AI Copilot ready", sub: "Your RFP draft is complete", icon: <Sparkles size={15} /> },
  ];

  const notif = notifications[tick % notifications.length];

  return (
    <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Top headline ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        <LiveDot />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#FE3C01", letterSpacing: "0.04em" }}>
          LIVE PROCUREMENT ACTIVITY
        </span>
      </motion.div>

      {/* ── Stat cards row ── */}
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard
          icon={<FileText size={15} />}
          label="Active Tenders"
          value="24"
          sub="↑ 4 this week"
          color="#FE3C01"
          delay={0.05}
        />
        <StatCard
          icon={<Send size={15} />}
          label="Bids Received"
          value={String(bidCount)}
          sub="last 24h"
          color="#1FA56A"
          delay={0.12}
        />
        <StatCard
          icon={<Users size={15} />}
          label="Vendors"
          value="138"
          sub="verified"
          color="#F0A800"
          delay={0.19}
        />
      </div>

      {/* ── Main tender card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "linear-gradient(150deg, #FFF5EE 0%, #FDEADB 100%)",
          borderRadius: 18,
          padding: "18px 20px",
          border: "1px solid rgba(254,60,1,0.12)",
          boxShadow: "0 4px 20px rgba(254,60,1,0.08)",
        }}
      >
        {/* Card header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <div style={{ background: "rgba(254,60,1,0.12)", borderRadius: 6, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <LiveDot />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#FE3C01" }}>LIVE</span>
              </div>
              <span style={{ fontSize: 10, color: "#8A8078" }}>Closes in 3 days</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0B0907", letterSpacing: "-0.03em", lineHeight: 1.25 }}>
              Office Supply Procurement
            </div>
            <div style={{ fontSize: 11.5, color: "#8A8078", marginTop: 4, lineHeight: 1.5 }}>
              Stationery & consumables · 3 Riyadh branches
            </div>
          </div>
          <div style={{ background: "white", borderRadius: 10, padding: "8px 12px", textAlign: "center", boxShadow: "0 2px 8px rgba(11,9,7,0.07)", flexShrink: 0, marginLeft: 12 }}>
            <motion.div
              key={bidCount}
              initial={{ scale: 1.3, color: "#FE3C01" }}
              animate={{ scale: 1, color: "#0B0907" }}
              transition={{ duration: 0.3 }}
              style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em" }}
            >
              {bidCount}
            </motion.div>
            <div style={{ fontSize: 9.5, color: "#8A8078", fontWeight: 600, marginTop: 1 }}>BIDS</div>
          </div>
        </div>

        {/* Budget + deadline */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Budget", value: "SAR 45,000", icon: <TrendingUp size={11} /> },
            { label: "Deadline", value: "Dec 15, 2024", icon: <Clock size={11} /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ flex: 1, background: "white", borderRadius: 10, padding: "8px 10px", border: "1px solid rgba(11,9,7,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#8A8078", fontSize: 10, marginBottom: 3 }}>
                {icon} {label}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0B0907" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Bid rows */}
        <div style={{ borderTop: "1px solid rgba(11,9,7,0.06)", paddingTop: 10, marginBottom: 2 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8A8078", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Top Bidders
          </div>
          <BidRow company="Al-Rashid Trading Co." amount="SAR 38K" score={91} color="#FE3C01" delay={0.38} />
          <BidRow company="Gulf Office Solutions" amount="SAR 42K" score={78} color="#1FA56A" delay={0.46} />
          <BidRow company="Saudi Supply Hub" amount="SAR 44K" score={65} color="#F0A800" delay={0.54} />
        </div>
      </motion.div>

      {/* ── Bottom row: company cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: "flex", gap: 10 }}
      >
        {[
          { name: "Maaden Group", role: "Requester", tenders: "12 tenders", color: "#FE3C01" },
          { name: "STC Solutions", role: "Vendor", tenders: "6 bids won", color: "#1FA56A" },
        ].map(({ name, role, tenders, color }) => (
          <div
            key={name}
            style={{
              flex: 1,
              background: "white",
              borderRadius: 14,
              padding: "13px 14px",
              boxShadow: "0 2px 10px rgba(11,9,7,0.05)",
              border: "1px solid rgba(11,9,7,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                <Building2 size={14} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0B0907", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                <div style={{ fontSize: 10, color: "#8A8078" }}>{role}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "#8A8078" }}>{tenders}</span>
              <ArrowUpRight size={12} color={color} />
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Floating notification toast ── */}
      <div style={{ position: "fixed", bottom: 32, right: 32, width: 290, zIndex: 50, pointerEvents: "none" }}>
        <AnimatePresence mode="wait">
          {showNotif && (
            <NotificationToast
              key={tick}
              text={notif.text}
              sub={notif.sub}
              icon={notif.icon}
              delay={0}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
