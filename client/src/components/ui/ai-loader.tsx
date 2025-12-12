import * as React from "react";

interface AILoaderProps {
  size?: number;
}

export const AILoader: React.FC<AILoaderProps> = ({ size = 120 }) => {
  return (
    <div
      className="relative flex items-center justify-center select-none rounded-full"
      style={{ 
        width: size, 
        height: size,
        background: "radial-gradient(circle, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)"
      }}
    >
      <div
        className="absolute inset-0 rounded-full animate-loaderCircle"
      />
      <style>{`
        @keyframes loaderCircle {
          0% {
            transform: rotate(90deg);
            box-shadow:
              0 6px 12px 0 #38bdf8 inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2),
              0 0 20px 4px rgba(56, 189, 248, 0.15);
          }
          50% {
            transform: rotate(270deg);
            box-shadow:
              0 6px 12px 0 #60a5fa inset,
              0 12px 6px 0 #0284c7 inset,
              0 24px 36px 0 #005dff inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2),
              0 0 20px 4px rgba(56, 189, 248, 0.15);
          }
          100% {
            transform: rotate(450deg);
            box-shadow:
              0 6px 12px 0 #4dc8fd inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2),
              0 0 20px 4px rgba(56, 189, 248, 0.15);
          }
        }

        .animate-loaderCircle {
          animation: loaderCircle 5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AILoader;
