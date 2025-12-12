import * as React from "react";

interface AILoaderProps {
  size?: number;
}

export const AILoader: React.FC<AILoaderProps> = ({ size = 120 }) => {
  const particleCount = 6;
  
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ 
        width: size * 1.5, 
        height: size * 1.5,
      }}
    >
      {/* Soft outer glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 1.35,
          height: size * 1.35,
          background: "radial-gradient(circle, rgba(226, 94, 69, 0.15) 0%, rgba(226, 94, 69, 0.05) 40%, transparent 70%)",
          filter: "blur(8px)",
          animation: "softerGlow 4s ease-in-out infinite",
        }}
      />

      {/* Floating particles */}
      {[...Array(particleCount)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 3 + (i % 2),
            height: 3 + (i % 2),
            background: "rgba(226, 94, 69, 0.6)",
            boxShadow: "0 0 4px 1px rgba(226, 94, 69, 0.3)",
            animationDelay: `${i * 0.6}s`,
            animation: `floatParticle ${4 + (i % 2)}s ease-in-out infinite`,
            ['--particle-angle' as string]: `${(360 / particleCount) * i}deg`,
            ['--particle-distance' as string]: `${size * 0.45}px`,
          }}
        />
      ))}

      {/* Main orb */}
      <div
        className="relative rounded-full"
        style={{ 
          width: size, 
          height: size,
          animation: "softBreathe 5s ease-in-out infinite",
        }}
      >
        {/* Soft gradient orb */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 38% 38%, #8a5a3a 0%, #6b4423 35%, #4a2e1a 70%, #3a2015 100%)`,
            boxShadow: `
              inset -8px -8px 16px rgba(0, 0, 0, 0.3),
              inset 6px 6px 12px rgba(255, 255, 255, 0.1),
              0 0 20px rgba(226, 94, 69, 0.12)
            `,
          }}
        />

        {/* Soft inner highlight */}
        <div
          className="absolute rounded-full"
          style={{
            top: '18%',
            left: '22%',
            width: '30%',
            height: '30%',
            background: "radial-gradient(circle, rgba(250, 180, 120, 0.4) 0%, rgba(250, 180, 120, 0.1) 50%, transparent 100%)",
            filter: "blur(6px)",
            animation: "softInnerGlow 4s ease-in-out infinite",
          }}
        />

        {/* Subtle surface shine */}
        <div
          className="absolute rounded-full"
          style={{
            top: '12%',
            left: '20%',
            width: '25%',
            height: '16%',
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%)",
            borderRadius: "50%",
            filter: "blur(3px)",
            animation: "softShimmer 3s ease-in-out infinite",
          }}
        />
      </div>

      {/* Soft shadow underneath */}
      <div
        style={{
          position: 'absolute',
          bottom: -size * 0.08,
          width: size * 0.6,
          height: size * 0.12,
          background: "radial-gradient(ellipse, rgba(0, 0, 0, 0.1) 0%, transparent 70%)",
          filter: "blur(8px)",
          animation: "softerShadow 5s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes softBreathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        @keyframes softInnerGlow {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.9;
          }
        }

        @keyframes softShimmer {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes softerGlow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes softerShadow {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes floatParticle {
          0%, 100% {
            transform: rotate(var(--particle-angle)) translateX(var(--particle-distance)) scale(0.8);
            opacity: 0.3;
          }
          50% {
            transform: rotate(calc(var(--particle-angle) + 180deg)) translateX(var(--particle-distance)) scale(1);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default AILoader;
