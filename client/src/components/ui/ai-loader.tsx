import * as React from "react";

interface AILoaderProps {
  size?: number;
}

export const AILoader: React.FC<AILoaderProps> = ({ size = 120 }) => {
  const particleCount = 8;
  
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ 
        width: size * 1.6, 
        height: size * 1.6,
      }}
    >
      {/* Outer glow ring - slow rotation */}
      <div
        className="absolute rounded-full animate-outerGlow"
        style={{
          width: size * 1.3,
          height: size * 1.3,
          background: "radial-gradient(circle, transparent 40%, rgba(251, 146, 60, 0.08) 60%, transparent 70%)",
        }}
      />
      
      {/* Middle glow ring - medium rotation opposite direction */}
      <div
        className="absolute rounded-full animate-middleGlow"
        style={{
          width: size * 1.15,
          height: size * 1.15,
          background: "radial-gradient(circle, transparent 50%, rgba(226, 94, 69, 0.12) 70%, transparent 85%)",
        }}
      />

      {/* Floating particles */}
      {[...Array(particleCount)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-particle"
          style={{
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
            background: i % 2 === 0 
              ? "radial-gradient(circle, #fb923c 0%, #E25E45 100%)" 
              : "radial-gradient(circle, #fdba74 0%, #f97316 100%)",
            boxShadow: "0 0 6px 2px rgba(251, 146, 60, 0.4)",
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${3 + (i % 3)}s`,
            ['--particle-angle' as string]: `${(360 / particleCount) * i}deg`,
            ['--particle-distance' as string]: `${size * 0.55 + (i % 2) * 8}px`,
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
        {/* Core orb with gradient */}
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

        {/* Animated circle with loaderCircle animation */}
        <div
          className="absolute inset-0 rounded-full animate-loaderCircle"
        />
      </div>

      {/* Drop shadow */}
      <div
        className="absolute rounded-full animate-shadowPulse"
        style={{
          bottom: -size * 0.1,
          width: size * 0.7,
          height: size * 0.15,
          background: "radial-gradient(ellipse, rgba(226, 94, 69, 0.25) 0%, transparent 70%)",
          filter: "blur(6px)",
        }}
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

        @keyframes outerGlow {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: rotate(180deg) scale(1.05);
            opacity: 0.9;
          }
          100% {
            transform: rotate(360deg) scale(1);
            opacity: 0.6;
          }
        }

        @keyframes middleGlow {
          0% {
            transform: rotate(0deg);
            opacity: 0.7;
          }
          50% {
            transform: rotate(-180deg);
            opacity: 1;
          }
          100% {
            transform: rotate(-360deg);
            opacity: 0.7;
          }
        }

        @keyframes particle {
          0%, 100% {
            transform: rotate(var(--particle-angle)) translateX(var(--particle-distance)) scale(0.8);
            opacity: 0.4;
          }
          25% {
            transform: rotate(calc(var(--particle-angle) + 45deg)) translateX(calc(var(--particle-distance) + 5px)) scale(1);
            opacity: 0.9;
          }
          50% {
            transform: rotate(calc(var(--particle-angle) + 90deg)) translateX(var(--particle-distance)) scale(0.9);
            opacity: 0.6;
          }
          75% {
            transform: rotate(calc(var(--particle-angle) + 135deg)) translateX(calc(var(--particle-distance) - 3px)) scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes shadowPulse {
          0%, 100% {
            transform: scaleX(1);
            opacity: 0.6;
          }
          50% {
            transform: scaleX(1.1);
            opacity: 0.8;
          }
        }

        .animate-loaderCircle {
          animation: loaderCircle 5s linear infinite;
        }

        .animate-outerGlow {
          animation: outerGlow 12s ease-in-out infinite;
        }

        .animate-middleGlow {
          animation: middleGlow 8s ease-in-out infinite;
        }

        .animate-particle {
          animation: particle 4s ease-in-out infinite;
        }

        .animate-shadowPulse {
          animation: shadowPulse 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AILoader;
