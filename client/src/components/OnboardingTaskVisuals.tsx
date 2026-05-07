import { motion } from "framer-motion";
import { Building2, Calendar, Camera, Check, Link2, Play, Plus, Sparkles, Trophy, User } from "lucide-react";

const CORAL = "#FE3C01";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative w-full h-[116px] rounded-xl bg-gradient-to-br from-[#FFF8F6] to-[#FFF1EC] dark:from-gray-900/40 dark:to-gray-900/20 border border-[#FE3C01]/10 overflow-hidden flex items-center justify-center"
    >
      {children}
    </motion.div>
  );
}

function Shimmer({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div className={`relative overflow-hidden rounded-full bg-muted ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FE3C01]/30 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.6, repeat: Infinity, delay, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ─── Task 1: Create Tender ──────────────────────────────────── */
export function CreateTenderVisual() {
  return (
    <Frame>
      <motion.div
        initial={{ rotate: -2, y: 4 }}
        animate={{ rotate: 0, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-[150px] bg-card rounded-lg shadow-md border border-border p-3 space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="h-1.5 w-12 rounded-full bg-gray-800" />
          <div className="px-1.5 py-0.5 rounded text-[7px] font-bold text-white bg-[#FE3C01]">RFP</div>
        </div>
        <Shimmer className="h-1.5 w-full" />
        <Shimmer className="h-1.5 w-4/5" delay={0.15} />
        <Shimmer className="h-1.5 w-3/5" delay={0.3} />
        <div className="pt-1.5 flex items-center justify-between">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
          <div className="h-4 px-2 rounded text-[7px] font-semibold text-white bg-[#FE3C01] flex items-center">
            Publish
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: "backOut" }}
        className="absolute top-3 right-3"
      >
        <Sparkles className="h-4 w-4 text-[#FE3C01]" />
      </motion.div>
    </Frame>
  );
}

/* ─── Task 2: Company Profile ────────────────────────────────── */
export function CompanyProfileVisual() {
  return (
    <Frame>
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="h-16 w-16 rounded-xl bg-card shadow-md border border-border flex items-center justify-center"
        >
          <Building2 className="h-7 w-7 text-[#FE3C01]" />
        </motion.div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-20 rounded-full bg-gray-800" />
          <div className="h-1.5 w-14 rounded-full bg-gray-300" />
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.35 }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 border border-green-200"
          >
            <Check className="h-2 w-2 text-green-600" />
            <span className="text-[7px] font-semibold text-green-700 dark:text-green-300">Verified</span>
          </motion.div>
        </div>
      </div>
    </Frame>
  );
}

/* ─── Task 3: Profile Picture ────────────────────────────────── */
export function ProfilePictureVisual() {
  return (
    <Frame>
      <motion.div
        initial={{ scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative"
      >
        <div className="h-20 w-20 rounded-full bg-card shadow-md border-2 border-dashed border-[#FE3C01]/40 flex items-center justify-center">
          <User className="h-9 w-9 text-[#FE3C01]/50" />
        </div>
        <motion.div
          initial={{ scale: 0, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "backOut" }}
          className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[#FE3C01] shadow-lg flex items-center justify-center border-2 border-white"
        >
          <Camera className="h-3.5 w-3.5 text-white" />
        </motion.div>
      </motion.div>
    </Frame>
  );
}

/* ─── Task 4: Invite Vendors ─────────────────────────────────── */
export function InviteVendorsVisual() {
  const avatars = [
    { bg: "bg-[#FE3C01]", icon: <User className="h-3.5 w-3.5 text-white" /> },
    { bg: "bg-amber-400", icon: <User className="h-3.5 w-3.5 text-white" /> },
    { bg: "bg-blue-400", icon: <User className="h-3.5 w-3.5 text-white" /> },
  ];
  return (
    <Frame>
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center">
          {avatars.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
              className={`h-8 w-8 rounded-full ${a.bg} border-2 border-white shadow flex items-center justify-center ${i > 0 ? "-ml-2" : ""}`}
            >
              {a.icon}
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
            className="h-8 w-8 rounded-full bg-card border-2 border-dashed border-[#FE3C01] flex items-center justify-center -ml-2"
          >
            <Plus className="h-3.5 w-3.5 text-[#FE3C01]" />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border shadow-sm"
        >
          <Link2 className="h-2.5 w-2.5 text-[#FE3C01]" />
          <span className="text-[8px] font-mono text-muted-foreground">bid.app/invite/…</span>
        </motion.div>
      </div>
    </Frame>
  );
}

/* ─── Book Demo Banner ───────────────────────────────────────── */
export function BookDemoVisual() {
  const days = Array.from({ length: 14 });
  const highlightedIndex = 8;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative w-[78px] flex-shrink-0 pointer-events-none select-none"
    >
      <div className="bg-card rounded-lg border border-border shadow-md p-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="h-1 w-5 rounded-full bg-gray-800" />
          <Calendar className="h-2.5 w-2.5 text-gray-400" />
        </div>
        <div className="grid grid-cols-7 gap-[3px]">
          {days.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-[2px] ${
                i === highlightedIndex ? "bg-[#FE3C01]" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
      <motion.div
        initial={{ scale: 0, y: 6 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: "backOut" }}
        className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-[#FE3C01] shadow-md border-2 border-white flex items-center justify-center"
      >
        <Play className="h-2.5 w-2.5 text-white fill-white" />
      </motion.div>
    </motion.div>
  );
}

/* ─── Task 5: Review Proposals ───────────────────────────────── */
export function ReviewProposalsVisual() {
  const cards = [
    { score: "92", highlight: true, bar: "w-[90%]" },
    { score: "78", highlight: false, bar: "w-[70%]" },
    { score: "64", highlight: false, bar: "w-[55%]" },
  ];
  return (
    <Frame>
      <div className="relative w-[160px]">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.1, ease: "easeOut" }}
            className={`mb-1.5 rounded-lg border shadow-sm px-2.5 py-1.5 flex items-center gap-2 ${
              c.highlight
                ? "bg-card border-[#FE3C01]/40 ring-1 ring-[#FE3C01]/20"
                : "bg-card/80 border-border"
            }`}
          >
            <div className="flex-1 space-y-1">
              <div className="h-1 w-14 rounded-full bg-gray-300" />
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${c.bar} ${c.highlight ? "bg-[#FE3C01]" : "bg-gray-300"}`}
                />
              </div>
            </div>
            <span className={`text-[9px] font-bold ${c.highlight ? "text-[#FE3C01]" : "text-gray-400"}`}>
              {c.score}
            </span>
            {c.highlight && (
              <Trophy className="h-3 w-3 text-[#FE3C01]" />
            )}
          </motion.div>
        ))}
      </div>
    </Frame>
  );
}
