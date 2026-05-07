import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "success" | "error";

interface AIAgentOrbProps {
  state?: OrbState;
  size?: number;
  statusText?: string;
  onClick?: () => void;
  className?: string;
}

// Animation speed multipliers for each state
const stateConfig = {
  idle: { speed: 1, intensity: 1 },
  listening: { speed: 1.5, intensity: 1.3 },
  thinking: { speed: 2.5, intensity: 1.5 },
  speaking: { speed: 2, intensity: 1.8 },
  success: { speed: 0.5, intensity: 1.2 },
  error: { speed: 3, intensity: 2 },
};

export const AIAgentOrb: React.FC<AIAgentOrbProps> = ({
  state = "idle",
  size = 120,
  statusText,
  onClick,
  className,
}) => {
  const config = stateConfig[state];
  const particleCount = 8;
  const uniqueId = React.useId().replace(/:/g, '');

  // Generate dynamic keyframe names based on state
  const getAnimationDuration = (base: number) => `${base / config.speed}s`;

  return (
    <motion.div
      className={cn("relative flex flex-col items-center justify-center select-none", className)}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: size * 1.6,
          height: size * 1.6,
        }}
      >
        {/* Outer glow ring - slow rotation */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 1.3,
            height: size * 1.3,
            background: "radial-gradient(circle, transparent 40%, rgba(251, 146, 60, 0.08) 60%, transparent 70%)",
          }}
          animate={{
            rotate: [0, 180, 360],
            scale: [1, 1.05 * config.intensity, 1],
            opacity: [0.6, 0.9 * config.intensity, 0.6],
          }}
          transition={{
            duration: 12 / config.speed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Middle glow ring - medium rotation opposite direction */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 1.15,
            height: size * 1.15,
            background: "radial-gradient(circle, transparent 50%, rgba(226, 94, 69, 0.12) 70%, transparent 85%)",
          }}
          animate={{
            rotate: [0, -180, -360],
            opacity: [0.7, 1 * config.intensity, 0.7],
          }}
          transition={{
            duration: 8 / config.speed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating particles */}
        {[...Array(particleCount)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              background:
                i % 2 === 0
                  ? "radial-gradient(circle, #fb923c 0%, #FE3C01 100%)"
                  : "radial-gradient(circle, #fdba74 0%, #f97316 100%)",
              boxShadow: "0 0 6px 2px rgba(251, 146, 60, 0.4)",
            }}
            animate={{
              rotate: [
                (360 / particleCount) * i,
                (360 / particleCount) * i + 45,
                (360 / particleCount) * i + 90,
                (360 / particleCount) * i + 135,
                (360 / particleCount) * i + 180,
              ],
              x: [
                Math.cos(((360 / particleCount) * i * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8),
                Math.cos((((360 / particleCount) * i + 45) * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8 + 5),
                Math.cos((((360 / particleCount) * i + 90) * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8),
                Math.cos((((360 / particleCount) * i + 135) * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8 - 3),
                Math.cos((((360 / particleCount) * i + 180) * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8),
              ],
              y: [
                Math.sin(((360 / particleCount) * i * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8),
                Math.sin((((360 / particleCount) * i + 45) * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8 + 5),
                Math.sin((((360 / particleCount) * i + 90) * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8),
                Math.sin((((360 / particleCount) * i + 135) * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8 - 3),
                Math.sin((((360 / particleCount) * i + 180) * Math.PI) / 180) * (size * 0.55 + (i % 2) * 8),
              ],
              scale: [0.8, 1 * config.intensity, 0.9, 1.1 * config.intensity, 0.8],
              opacity: [0.4, 0.9 * config.intensity, 0.6, 0.8 * config.intensity, 0.4],
            }}
            transition={{
              duration: (4 + (i % 3)) / config.speed,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i * 0.5) / config.speed,
            }}
          />
        ))}

        {/* Main orb container */}
        <div
          className="relative rounded-full"
          style={{
            width: size,
            height: size,
          }}
        >
          {/* Core orb with gradient - exact match */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 35%, #4a2a1a 0%, #2a1a0f 40%, #1a0f0a 100%)",
              boxShadow: `
                inset 0 -${size * 0.15}px ${size * 0.3}px rgba(0, 0, 0, 0.5),
                0 0 ${size * 0.2}px ${size * 0.05}px rgba(251, 146, 60, 0.2)
              `,
            }}
          />

          {/* Animated inner glow circle - exact match to loaderCircle */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              rotate: [90, 270, 450],
              boxShadow: [
                `0 6px 12px 0 #fb923c inset, 0 12px 18px 0 #FE3C01 inset, 0 36px 36px 0 #9a3412 inset, 0 0 3px 1.2px rgba(251, 146, 60, 0.3), 0 0 6px 1.8px rgba(226, 94, 69, 0.2), 0 0 ${20 * config.intensity}px 4px rgba(251, 146, 60, ${0.15 * config.intensity})`,
                `0 6px 12px 0 #fdba74 inset, 0 12px 6px 0 #ea580c inset, 0 24px 36px 0 #FE3C01 inset, 0 0 3px 1.2px rgba(251, 146, 60, 0.3), 0 0 6px 1.8px rgba(226, 94, 69, 0.2), 0 0 ${20 * config.intensity}px 4px rgba(251, 146, 60, ${0.15 * config.intensity})`,
                `0 6px 12px 0 #f97316 inset, 0 12px 18px 0 #FE3C01 inset, 0 36px 36px 0 #9a3412 inset, 0 0 3px 1.2px rgba(251, 146, 60, 0.3), 0 0 6px 1.8px rgba(226, 94, 69, 0.2), 0 0 ${20 * config.intensity}px 4px rgba(251, 146, 60, ${0.15 * config.intensity})`,
              ],
            }}
            transition={{
              duration: 5 / config.speed,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* State-specific overlays */}
          <AnimatePresence>
            {/* Thinking spinner overlay */}
            {state === "thinking" && (
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: "rgba(255,255,255,0.6)",
                  borderRightColor: "rgba(255,255,255,0.2)",
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                  rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                }}
              />
            )}

            {/* Listening pulse rings */}
            {state === "listening" && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-orange-400/30"
                    initial={{ scale: 0.8, opacity: 0.6 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: i * 0.5,
                    }}
                  />
                ))}
              </>
            )}

            {/* Speaking sound waves */}
            {state === "speaking" && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="bg-card/70 rounded-full"
                    style={{ width: 3 }}
                    animate={{
                      height: [6, 16 + i * 3, 6],
                    }}
                    transition={{
                      duration: 0.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.08,
                    }}
                  />
                ))}
              </motion.div>
            )}

            {/* Success checkmark */}
            {state === "success" && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <svg
                  className="w-1/2 h-1/2 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>
            )}

            {/* Error X */}
            {state === "error" && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                <svg
                  className="w-1/3 h-1/3 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drop shadow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            bottom: -size * 0.1,
            width: size * 0.7,
            height: size * 0.15,
            background: "radial-gradient(ellipse, rgba(226, 94, 69, 0.25) 0%, transparent 70%)",
            filter: "blur(6px)",
          }}
          animate={{
            scaleX: [1, 1.1 * config.intensity, 1],
            opacity: [0.6, 0.8 * config.intensity, 0.6],
          }}
          transition={{
            duration: 4 / config.speed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Status text below orb */}
      <AnimatePresence mode="wait">
        {statusText && (
          <motion.div
            key={statusText}
            className="mt-4 px-4 py-2 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <motion.p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
              {(state === "thinking" || state === "listening" || state === "speaking") && (
                <span className="inline-flex gap-1">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#FE3C01]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#FE3C01]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#FE3C01]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </span>
              )}
              {statusText}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AIAgentOrb;
