import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface ParticleButtonProps extends ButtonProps {
    onSuccess?: () => void;
    successDuration?: number;
    particleColor?: string;
}

function Sparkles({
    buttonRef,
}: {
    buttonRef: React.RefObject<HTMLButtonElement>;
}) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const particles = [...Array(6)].map((_, i) => {
        const angle = (360 / 6) * i + Math.random() * 30 - 15;
        const velocity = 40 + Math.random() * 30;
        const rad = (angle * Math.PI) / 180;
        const size = 3 + Math.random() * 3;
        
        return {
            id: i,
            x: Math.cos(rad) * velocity,
            y: Math.sin(rad) * velocity - 20,
            size,
            delay: i * 0.03,
        };
    });

    return (
        <AnimatePresence>
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="fixed rounded-full pointer-events-none"
                    style={{ 
                        left: centerX, 
                        top: centerY,
                        width: particle.size,
                        height: particle.size,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(147,197,253,0.8))',
                        filter: 'blur(0.5px)',
                        zIndex: 9999,
                    }}
                    initial={{
                        scale: 0,
                        x: 0,
                        y: 0,
                        opacity: 0,
                    }}
                    animate={{
                        scale: [0, 1.2, 1, 0],
                        x: [0, particle.x],
                        y: [0, particle.y],
                        opacity: [0, 1, 0.8, 0],
                    }}
                    transition={{
                        duration: 0.65,
                        delay: particle.delay,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                />
            ))}
            
            {/* Soft glow */}
            <motion.div
                className="fixed rounded-full pointer-events-none"
                style={{ 
                    left: centerX, 
                    top: centerY,
                    background: 'radial-gradient(circle, rgba(147,197,253,0.3) 0%, transparent 70%)',
                    zIndex: 9998,
                }}
                initial={{
                    width: 20,
                    height: 20,
                    opacity: 0.5,
                    x: '-50%',
                    y: '-50%',
                }}
                animate={{
                    width: 90,
                    height: 90,
                    opacity: 0,
                    x: '-50%',
                    y: '-50%',
                }}
                transition={{
                    duration: 0.35,
                    ease: "easeOut",
                }}
            />
        </AnimatePresence>
    );
}

function ParticleButton({
    children,
    onClick,
    onSuccess,
    successDuration = 700,
    particleColor = "bg-blue-400",
    className,
    ...props
}: ParticleButtonProps) {
    const [showParticles, setShowParticles] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        setShowParticles(true);

        setTimeout(() => {
            if (onSuccess) {
                onSuccess();
            }
            if (onClick) {
                onClick(e);
            }
        }, 300);

        setTimeout(() => {
            setShowParticles(false);
        }, successDuration);
    };

    return (
        <>
            {showParticles && <Sparkles buttonRef={buttonRef} />}
            <Button
                ref={buttonRef}
                onClick={handleClick}
                className={cn(
                    "relative overflow-visible",
                    className
                )}
                {...props}
            >
                <motion.span
                    className="flex items-center gap-2"
                    animate={showParticles ? { 
                        scale: [1, 0.96, 1.02, 1],
                    } : {}}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                >
                    {children}
                </motion.span>
            </Button>
        </>
    );
}

export { ParticleButton };
