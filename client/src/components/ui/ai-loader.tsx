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
        background: "radial-gradient(circle, #2a1a0f 0%, #4a2a1a 50%, #1a0f0a 100%)"
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
              0 6px 12px 0 #fb923c inset,
              0 12px 18px 0 #E25E45 inset,
              0 36px 36px 0 #9a3412 inset,
              0 0 3px 1.2px rgba(251, 146, 60, 0.3),
              0 0 6px 1.8px rgba(226, 94, 69, 0.2),
              0 0 20px 4px rgba(251, 146, 60, 0.15);
          }
          50% {
            transform: rotate(270deg);
            box-shadow:
              0 6px 12px 0 #fdba74 inset,
              0 12px 6px 0 #ea580c inset,
              0 24px 36px 0 #E25E45 inset,
              0 0 3px 1.2px rgba(251, 146, 60, 0.3),
              0 0 6px 1.8px rgba(226, 94, 69, 0.2),
              0 0 20px 4px rgba(251, 146, 60, 0.15);
          }
          100% {
            transform: rotate(450deg);
            box-shadow:
              0 6px 12px 0 #f97316 inset,
              0 12px 18px 0 #E25E45 inset,
              0 36px 36px 0 #9a3412 inset,
              0 0 3px 1.2px rgba(251, 146, 60, 0.3),
              0 0 6px 1.8px rgba(226, 94, 69, 0.2),
              0 0 20px 4px rgba(251, 146, 60, 0.15);
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
