import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, Users } from "lucide-react";
import { CardType, FIELD_INSIGHTS, getCardDefinition } from "@/lib/form-builder-types";

interface FieldInsightPanelProps {
  cardType: CardType | null;
  onClose: () => void;
}

export function FieldInsightPanel({ cardType, onClose }: FieldInsightPanelProps) {
  const insight = cardType ? FIELD_INSIGHTS[cardType] : null;

  useEffect(() => {
    if (!insight) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [insight, onClose]);
  const definition = cardType ? getCardDefinition(cardType) : null;
  const Icon = definition?.icon;

  return (
    <AnimatePresence>
      {insight && (
        <>
          {/* Backdrop - subtle click-to-close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 320,
              mass: 0.7,
            }}
            className="fixed right-4 top-20 z-50 w-[340px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <div className="p-1.5 rounded-lg bg-[#E25E45]/10">
                    <Icon className="h-4 w-4 text-[#E25E45]" />
                  </div>
                )}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {insight.title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-4 space-y-3">
              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.25 }}
                className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed"
              >
                {insight.description}
              </motion.p>

              {/* Vendor Tip */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/30 p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-900 dark:text-blue-300">
                    Vendor Perspective
                  </span>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-200/80 leading-relaxed">
                  {insight.vendorTip}
                </p>
              </motion.div>

              {/* Best Practice */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.25 }}
                className="rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/30 p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-900 dark:text-amber-300">
                    Best Practice
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed">
                  {insight.bestPractice}
                </p>
              </motion.div>

              {/* Got it button - inline, no separator */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.25 }}
                onClick={onClose}
                className="w-full py-2 rounded-lg bg-[#E25E45] hover:bg-[#d54d35] text-white text-xs font-medium transition-colors"
              >
                Got it
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
