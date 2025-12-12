import * as React from "react";

interface AILoaderProps {
  size?: number;
  showText?: boolean;
}

export const AILoader: React.FC<AILoaderProps> = ({ size = 120, showText = false }) => {
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          animation: "loaderCircle 5s linear infinite",
          boxShadow: `
            0 6px 12px 0 #38bdf8 inset,
            0 12px 18px 0 #005dff inset,
            0 36px 36px 0 #1e40af inset,
            0 0 3px 1.2px rgba(56, 189, 248, 0.3),
            0 0 6px 1.8px rgba(0, 93, 255, 0.2)
          `
        }}
      />
      {showText && (
        <span className="text-white/70 text-sm font-medium z-10">Generating</span>
      )}
      <style>{`
        @keyframes loaderCircle {
          0% {
            transform: rotate(90deg);
            box-shadow:
              0 6px 12px 0 #38bdf8 inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
          50% {
            transform: rotate(270deg);
            box-shadow:
              0 6px 12px 0 #60a5fa inset,
              0 12px 6px 0 #0284c7 inset,
              0 24px 36px 0 #005dff inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
          100% {
            transform: rotate(450deg);
            box-shadow:
              0 6px 12px 0 #4dc8fd inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
        }
      `}</style>
    </div>
  );
};

export default AILoader;
