import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Plus, Calendar, Send, Search, CheckCircle2 } from "lucide-react";

const SCENE_DURATION = 4000;

// ── macOS arrow cursor ────────────────────────────────────────────────────────
function MacCursor() {
  return (
    <svg
      width="24"
      height="28"
      viewBox="0 0 24 28"
      fill="none"
      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.35))", display: "block" }}
    >
      {/* White outline layer */}
      <path
        d="M2 1L2 21L8 15.5L12 24.5L15.5 23L11.5 14H20L2 1Z"
        fill="white"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Black fill layer on top */}
      <path
        d="M2 1L2 21L8 15.5L12 24.5L15.5 23L11.5 14H20L2 1Z"
        fill="#0B0907"
        stroke="#0B0907"
        strokeWidth="0.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── macOS window chrome ───────────────────────────────────────────────────────
function WindowChrome({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "11px 16px",
        background: "#1E1815",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}
    >
      {(["#FF5F57", "#FEBC2E", "#28C840"] as const).map((c) => (
        <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, flexShrink: 0 }} />
      ))}
      <span
        style={{
          flex: 1,
          textAlign: "center",
          marginLeft: -54,
          fontSize: 11,
          fontWeight: 500,
          color: "rgba(255,255,255,0.28)",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ── Status badge (matches real Bid app) ──────────────────────────────────────
function StatusBadge({ color, label, bg }: { color: string; label: string; bg: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: bg,
        borderRadius: 999,
        padding: "3px 10px",
        flexShrink: 0,
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: "#0B0907" }}>{label}</span>
    </div>
  );
}

// ── Tender card (real app peach gradient) ────────────────────────────────────
function TenderCard({
  title, badge, desc, date, bids, budget, delay = 0,
}: {
  title: string; badge: { color: string; label: string; bg: string };
  desc?: string; date: string; bids: string; budget: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      style={{
        background: badge.color === "#FE3C01"
          ? "linear-gradient(155deg, #FFF3EA 0%, #F9D8BF 100%)"
          : badge.color === "#1FA56A"
          ? "linear-gradient(155deg, #F0FDF8 0%, #DCFCE7 100%)"
          : "white",
        border: `1px solid ${badge.color === "#FE3C01" ? "rgba(254,60,1,0.12)" : badge.color === "#1FA56A" ? "rgba(31,165,106,0.15)" : "rgba(11,9,7,0.08)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: desc ? 8 : 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0B0907", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
          {title}
        </span>
        <StatusBadge {...badge} />
      </div>
      {desc && (
        <p style={{ fontSize: 11.5, color: "#8A8078", lineHeight: 1.55, marginBottom: 10 }}>{desc}</p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: "#8A8078" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#1FA56A" }}>
          <Calendar style={{ width: 11, height: 11 }} /> {date}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Send style={{ width: 11, height: 11 }} /> {bids}
        </span>
        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0B0907", fontSize: 11.5 }}>
          {budget}
        </span>
      </div>
    </motion.div>
  );
}

// ── Scene 1: Dashboard ────────────────────────────────────────────────────────
function SceneCreate() {
  return (
    <motion.div
      key="create"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      style={{ width: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(254,60,1,0.06)",
          display: "flex",
          flexDirection: "column",
          height: "clamp(460px, calc(100vh - 96px), 700px)",
        }}
      >
        <WindowChrome title="Bid · My Tenders" />

        {/* App content */}
        <div
          style={{
            background: "#F4EDE1",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 13,
            flex: 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#0B0907", letterSpacing: "-0.03em" }}>
              My Tenders
            </span>
            <motion.div
              initial={{ boxShadow: "0 0 0 0px rgba(254,60,1,0)" }}
              animate={{
                boxShadow: [
                  "0 0 0 0px rgba(254,60,1,0)",
                  "0 0 0 0px rgba(254,60,1,0)",
                  "0 0 0 5px rgba(254,60,1,0.24)",
                  "0 0 0 5px rgba(254,60,1,0.24)",
                  "0 0 0 0px rgba(254,60,1,0)",
                ],
                scale: [1, 1, 1, 0.87, 1],
              }}
              transition={{ duration: 3.0, times: [0, 0.32, 0.48, 0.57, 0.70] }}
              style={{
                background: "#FE3C01",
                color: "white",
                fontSize: 12.5,
                fontWeight: 700,
                padding: "8px 15px",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 5,
                cursor: "default",
              }}
            >
              <Plus style={{ width: 13, height: 13 }} /> New RFP
            </motion.div>
          </div>

          {/* Search bar */}
          <div
            style={{
              background: "white",
              border: "1.5px solid rgba(11,9,7,0.08)",
              borderRadius: 10,
              padding: "9px 13px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <Search style={{ width: 14, height: 14, color: "#8A8078", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "rgba(11,9,7,0.3)" }}>Search tenders…</span>
          </div>

          {/* Cards */}
          <TenderCard
            title="Office Supply Procurement"
            badge={{ color: "#FE3C01", label: "Live", bg: "rgba(254,60,1,0.10)" }}
            desc="Stationery, printing supplies & consumables for 3 Riyadh branches."
            date="Dec 15" bids="5 bids" budget="SAR 45K"
            delay={0.05}
          />
          <TenderCard
            title="IT Infrastructure Upgrade"
            badge={{ color: "#F0A800", label: "Draft", bg: "rgba(240,168,0,0.14)" }}
            date="Jan 10" bids="0 bids" budget="SAR 120K"
            delay={0.12}
          />
          <TenderCard
            title="Marketing Campaign Q1"
            badge={{ color: "#1FA56A", label: "Won", bg: "rgba(31,165,106,0.12)" }}
            date="Nov 30" bids="8 bids" budget="SAR 32K"
            delay={0.19}
          />

          {/* macOS cursor — sweeps from bottom-left to the "+ New RFP" button */}
          <motion.div
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 20 }}
            initial={{ x: 60, y: 520, opacity: 0 }}
            animate={{
              x:       [60,   60,   330,  330,  330,  330],
              y:       [520,  520,  8,    8,    8,    8],
              opacity: [0,    1,    1,    1,    1,    1],
              scale:   [1,    1,    1,    1,  0.82,   1],
            }}
            transition={{
              duration: 3.0,
              times:   [0,  0.06, 0.40, 0.46, 0.57, 0.70],
              ease: "easeInOut",
            }}
          >
            <MacCursor />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Scene 2: AI Copilot ───────────────────────────────────────────────────────
function SceneAI() {
  return (
    <motion.div
      key="ai"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      style={{ width: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(254,60,1,0.06)",
          display: "flex",
          flexDirection: "column",
          height: "clamp(460px, calc(100vh - 96px), 700px)",
        }}
      >
        <WindowChrome title="Bid · AI Copilot" />

        <div
          style={{
            background: "#F4EDE1",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            flex: 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Sparkles style={{ width: 16, height: 16, color: "#FE3C01" }} />
              <span style={{ fontSize: 17, fontWeight: 800, color: "#0B0907", letterSpacing: "-0.03em" }}>
                AI Copilot
              </span>
            </div>
            <div
              style={{
                background: "white",
                border: "1.5px solid rgba(11,9,7,0.10)",
                color: "#0B0907",
                fontSize: 11.5,
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 9,
              }}
            >
              New session
            </div>
          </div>

          {/* User chat bubble */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            style={{
              alignSelf: "flex-end",
              background: "linear-gradient(135deg, #FE3C01, #F05A00)",
              color: "white",
              fontSize: 12,
              lineHeight: 1.55,
              padding: "10px 14px",
              borderRadius: "14px 14px 4px 14px",
              maxWidth: "80%",
              flexShrink: 0,
            }}
          >
            I need office supplies for 3 branches — create an RFP for me.
          </motion.div>

          {/* AI response bubble with typing */}
          <div
            style={{
              alignSelf: "flex-start",
              background: "white",
              border: "1.5px solid rgba(11,9,7,0.08)",
              borderRadius: "14px 14px 14px 4px",
              padding: "12px 14px",
              width: "88%",
              flexShrink: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Sparkles style={{ width: 12, height: 12, color: "#FE3C01" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#FE3C01" }}>Generating your RFP…</span>
            </div>
            {/* Shimmer skeleton lines */}
            {([["100%", 0], ["85%", 0.1], ["65%", 0.2]] as [string, number][]).map(([w, delay], i) => (
              <div
                key={i}
                style={{ height: 9, borderRadius: 999, background: "rgba(11,9,7,0.07)", marginBottom: i < 2 ? 7 : 0, overflow: "hidden", width: w }}
              >
                <motion.div
                  style={{ height: "100%", background: "linear-gradient(90deg, transparent, rgba(254,60,1,0.18), transparent)" }}
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 1.3, repeat: Infinity, delay, ease: "easeInOut" }}
                />
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 11.5, color: "#8A8078" }}>Drafting sections…</span>
              <motion.span
                style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#FE3C01" }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              >
                76%
              </motion.span>
            </div>
            <div style={{ height: 7, background: "rgba(11,9,7,0.08)", borderRadius: 999, overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", background: "linear-gradient(90deg, #FE3C01, #F19A8F)", borderRadius: 999 }}
                initial={{ width: "0%" }}
                animate={{ width: "76%" }}
                transition={{ delay: 0.4, duration: 2.2, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Partial preview card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.35 }}
            style={{
              background: "white",
              border: "1.5px solid rgba(254,60,1,0.14)",
              borderRadius: 12,
              padding: "13px 15px",
              flex: 1,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0B0907", letterSpacing: "-0.02em" }}>
                Office Supply Procurement
              </span>
              <span style={{ fontSize: 10, color: "#8A8078", background: "rgba(11,9,7,0.05)", padding: "2px 8px", borderRadius: 999 }}>
                Draft
              </span>
            </div>
            {["Scope of Work", "Requirements", "Evaluation Criteria", "Timeline"].map((section, i) => (
              <motion.div
                key={section}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.12, duration: 0.25 }}
                style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}
              >
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FE3C01", flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: "#0B0907", fontWeight: 500 }}>{section}</span>
                <div style={{ flex: 1, height: 1, background: "rgba(11,9,7,0.06)" }} />
              </motion.div>
            ))}
          </motion.div>

          {/* macOS cursor — clicks into the user input area */}
          <motion.div
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 20 }}
            initial={{ x: 300, y: 520, opacity: 0 }}
            animate={{
              x:       [300,  300,  170,  170,  170],
              y:       [520,  520,  102,  102,  102],
              opacity: [0,    1,    1,    1,    1],
              scale:   [1,    1,    1,  0.84,   1],
            }}
            transition={{
              duration: 3.0,
              times:   [0,  0.07, 0.38, 0.50, 0.62],
              ease: "easeInOut",
            }}
          >
            <MacCursor />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Scene 3: RFP Ready ────────────────────────────────────────────────────────
function SceneReady() {
  return (
    <motion.div
      key="ready"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      style={{ width: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(254,60,1,0.06)",
          display: "flex",
          flexDirection: "column",
          height: "clamp(460px, calc(100vh - 96px), 700px)",
        }}
      >
        <WindowChrome title="Bid · Office Supply Procurement" />

        <div
          style={{
            background: "#F4EDE1",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 13,
            flex: 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#0B0907", letterSpacing: "-0.03em" }}>
              RFP Ready
            </span>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(31,165,106,0.12)", padding: "5px 12px", borderRadius: 999 }}
            >
              <CheckCircle2 style={{ width: 14, height: 14, color: "#1FA56A" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1FA56A" }}>Generated</span>
            </motion.div>
          </div>

          {/* Main tender card — large, peach gradient */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            style={{
              background: "linear-gradient(155deg, #FFF3EA 0%, #F9D4B0 100%)",
              border: "1.5px solid rgba(254,60,1,0.14)",
              borderRadius: 14,
              padding: "16px 18px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#0B0907", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                Office Supply Procurement
              </span>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.42, ease: [0.175, 0.885, 0.32, 1.275] }}
              >
                <StatusBadge color="#FE3C01" label="Live" bg="rgba(254,60,1,0.10)" />
              </motion.div>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ fontSize: 12, color: "#8A8078", lineHeight: 1.6, marginBottom: 12 }}
            >
              Stationery, printing supplies & consumables for 3 Riyadh branches.
              Standard Saudi ETIMAD compliance required.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
              style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#8A8078", marginBottom: 14 }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#1FA56A" }}>
                <Calendar style={{ width: 13, height: 13 }} /> Dec 15, 2024
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Send style={{ width: 13, height: 13 }} /> 3 bids
              </span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0B0907", fontSize: 12.5 }}>
                SAR 25,000
              </span>
            </motion.div>

            {/* Evaluation weights */}
            <div style={{ borderTop: "1px solid rgba(11,9,7,0.07)", paddingTop: 12 }}>
              {([["Price", 40, "#FE3C01"], ["Quality", 35, "#F0A800"], ["Delivery", 25, "#1FA56A"]] as [string, number, string][]).map(([label, pct, color], i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 2 ? 7 : 0 }}
                >
                  <span style={{ fontSize: 11, color: "#8A8078", width: 52, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: 5, background: "rgba(11,9,7,0.08)", borderRadius: 999, overflow: "hidden" }}>
                    <motion.div
                      style={{ height: "100%", background: color, borderRadius: 999 }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.45 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0B0907", width: 28, textAlign: "right", flexShrink: 0 }}>{pct}%</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ display: "flex", gap: 8, flexShrink: 0 }}
          >
            <motion.div
              initial={{ boxShadow: "0 0 0 0px rgba(254,60,1,0)" }}
              animate={{
                boxShadow: [
                  "0 0 0 0px rgba(254,60,1,0)",
                  "0 0 0 0px rgba(254,60,1,0)",
                  "0 0 0 5px rgba(254,60,1,0.24)",
                  "0 0 0 5px rgba(254,60,1,0.24)",
                  "0 0 0 0px rgba(254,60,1,0)",
                ],
                scale: [1, 1, 1, 0.87, 1],
              }}
              transition={{ duration: 3.0, times: [0, 0.38, 0.52, 0.62, 0.76] }}
              style={{ background: "#FE3C01", color: "white", fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 10, cursor: "default" }}
            >
              Publish RFP
            </motion.div>
            <div style={{ background: "white", border: "1.5px solid rgba(11,9,7,0.10)", color: "#0B0907", fontSize: 13, fontWeight: 500, padding: "10px 16px", borderRadius: 10 }}>
              Edit
            </div>
            <div style={{ background: "white", border: "1.5px solid rgba(11,9,7,0.10)", color: "#0B0907", fontSize: 13, fontWeight: 500, padding: "10px 16px", borderRadius: 10 }}>
              Share Link
            </div>
          </motion.div>

          {/* Activity feed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            style={{ background: "white", border: "1px solid rgba(11,9,7,0.07)", borderRadius: 12, padding: "12px 14px", flex: 1 }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: "#8A8078", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Activity
            </span>
            {[
              { text: "5 vendors viewed your RFP", time: "2m ago", dot: "#FE3C01" },
              { text: "3 vendors saved to their list", time: "5m ago", dot: "#F0A800" },
              { text: "RFP generated by AI Copilot", time: "12m ago", dot: "#1FA56A" },
            ].map(({ text, time, dot }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 + i * 0.1 }}
                style={{ display: "flex", alignItems: "center", gap: 9, paddingTop: 9 }}
              >
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: "#0B0907", flex: 1 }}>{text}</span>
                <span style={{ fontSize: 10, color: "#8A8078", flexShrink: 0 }}>{time}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* macOS cursor — sweeps to the Publish button */}
          <motion.div
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 20 }}
            initial={{ x: 280, y: 80, opacity: 0 }}
            animate={{
              x:       [280,  280,  10,   10,   10],
              y:       [80,   80,   395,  395,  395],
              opacity: [0,    1,    1,    1,    1],
              scale:   [1,    1,    1,  0.84,   1],
            }}
            transition={{
              duration: 3.0,
              times:   [0,  0.07, 0.44, 0.56, 0.70],
              ease: "easeInOut",
            }}
          >
            <MacCursor />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Scene sequencer ───────────────────────────────────────────────────────────
const SCENES = [SceneCreate, SceneAI, SceneReady];

export function OnboardingLeftPanelAnimation() {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setScene((s) => (s + 1) % SCENES.length), SCENE_DURATION);
    return () => clearTimeout(t);
  }, [scene]);

  const SceneComponent = SCENES[scene];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 14 }}>
      <div style={{ width: "100%" }}>
        <AnimatePresence mode="wait">
          <SceneComponent key={scene} />
        </AnimatePresence>
      </div>

      {/* Scene indicator dots */}
      <div style={{ display: "flex", gap: 7 }}>
        {SCENES.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === scene ? 24 : 7,
              backgroundColor: i === scene ? "#FE3C01" : "rgba(11,9,7,0.15)",
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ height: 6, borderRadius: 999, cursor: "pointer" }}
            onClick={() => setScene(i)}
          />
        ))}
      </div>
    </div>
  );
}
