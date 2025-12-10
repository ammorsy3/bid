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

function SuccessParticles({
    buttonRef,
    color = "bg-blue-400",
}: {
    buttonRef: React.RefObject<HTMLButtonElement>;
    color?: string;
}) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const particleCount = 20;
    const particles = [...Array(particleCount)].map((_, i) => {
        const angle = (360 / particleCount) * i + Math.random() * 20;
        const velocity = 80 + Math.random() * 100;
        const rad = (angle * Math.PI) / 180;
        const size = 8 + Math.random() * 8;
        
        return {
            id: i,
            x: Math.cos(rad) * velocity,
            y: Math.sin(rad) * velocity,
            size,
            delay: Math.random() * 0.15,
        };
    });

    return (
        <AnimatePresence>
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className={cn(
                        "fixed rounded-full pointer-events-none",
                        color
                    )}
                    style={{ 
                        left: centerX, 
                        top: centerY,
                        width: particle.size,
                        height: particle.size,
                        boxShadow: `0 0 12px 4px currentColor`,
                        zIndex: 9999,
                    }}
                    initial={{
                        scale: 0,
                        x: 0,
                        y: 0,
                        opacity: 1,
                    }}
                    animate={{
                        scale: [0, 1.5, 1, 0.5],
                        x: [0, particle.x * 0.3, particle.x * 0.7, particle.x],
                        y: [0, particle.y * 0.3, particle.y * 0.7, particle.y],
                        opacity: [1, 1, 0.8, 0],
                    }}
                    transition={{
                        duration: 1.2,
                        delay: particle.delay,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                />
            ))}
            
            {/* Central ripple effect */}
            <motion.div
                className="fixed rounded-full pointer-events-none border-4 border-blue-400"
                style={{ 
                    left: centerX, 
                    top: centerY,
                    translateX: '-50%',
                    translateY: '-50%',
                    zIndex: 9998,
                }}
                initial={{
                    width: 20,
                    height: 20,
                    opacity: 0.8,
                    x: '-50%',
                    y: '-50%',
                }}
                animate={{
                    width: 150,
                    height: 150,
                    opacity: 0,
                    x: '-50%',
                    y: '-50%',
                }}
                transition={{
                    duration: 0.8,
                    ease: "easeOut",
                }}
            />
            
            {/* Secondary smaller ripple */}
            <motion.div
                className="fixed rounded-full pointer-events-none border-2 border-blue-300"
                style={{ 
                    left: centerX, 
                    top: centerY,
                    zIndex: 9998,
                }}
                initial={{
                    width: 10,
                    height: 10,
                    opacity: 0.6,
                    x: '-50%',
                    y: '-50%',
                }}
                animate={{
                    width: 100,
                    height: 100,
                    opacity: 0,
                    x: '-50%',
                    y: '-50%',
                }}
                transition={{
                    duration: 0.6,
                    delay: 0.1,
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
    successDuration = 1200,
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
        }, 400);

        setTimeout(() => {
            setShowParticles(false);
        }, successDuration);
    };

    return (
        <>
            {showParticles && <SuccessParticles buttonRef={buttonRef} color={particleColor} />}
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
                        scale: [1, 0.92, 1.05, 1],
                    } : {}}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    {children}
                </motion.span>
            </Button>
        </>
    );
}

export { ParticleButton };
