"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Time-driven spatial ambient color stages
const COLOR_PALETTE = [
  { 
    main: "rgba(16, 185, 129, 0.45)", 
    secondary: "rgba(45, 212, 191, 0.40)", 
    glow: "rgba(52, 211, 153, 0.55)", 
    solid: "rgb(52, 211, 153)", 
    rgb: "52, 211, 153",
    gradient: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
  },
  { 
    main: "rgba(56, 189, 248, 0.45)", 
    secondary: "rgba(59, 130, 246, 0.40)", 
    glow: "rgba(14, 165, 233, 0.55)", 
    solid: "rgb(56, 189, 248)", 
    rgb: "56, 189, 248",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
  },
  { 
    main: "rgba(168, 85, 247, 0.45)", 
    secondary: "rgba(192, 132, 252, 0.40)", 
    glow: "rgba(192, 132, 252, 0.55)", 
    solid: "rgb(192, 132, 252)", 
    rgb: "192, 132, 252",
    gradient: "linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)",
  },
  { 
    main: "rgba(244, 63, 94, 0.45)", 
    secondary: "rgba(251, 113, 133, 0.40)", 
    glow: "rgba(244, 114, 182, 0.55)", 
    solid: "rgb(251, 113, 133)", 
    rgb: "251, 113, 133",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #f472b6 100%)",
  },
  { 
    main: "rgba(245, 158, 11, 0.45)", 
    secondary: "rgba(251, 191, 36, 0.40)", 
    glow: "rgba(252, 211, 77, 0.55)", 
    solid: "rgb(251, 191, 36)", 
    rgb: "251, 191, 36",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
  },
];

export function MouseGradient() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches)) return;

    let rafId: number | null = null;
    let latestX = 0;
    let latestY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      latestX = e.clientX;
      latestY = e.clientY;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setMousePos({ x: latestX, y: latestY });
          rafId = null;
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const winWidth = isMounted && typeof window !== "undefined" ? window.innerWidth : 1000;
  const winHeight = isMounted && typeof window !== "undefined" ? window.innerHeight : 800;

  const mainColors = COLOR_PALETTE.map(c => c.main);
  const secondaryColors = COLOR_PALETTE.map(c => c.secondary);
  const glowColors = COLOR_PALETTE.map(c => c.glow);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden gpu-accelerated">
      {/* Top-Center Main Glow - Continuous Infinite Loop */}
      <motion.div
        animate={{ 
          background: mainColors,
          scale: [1, 1.12, 1.05, 1],
        }}
        transition={{ 
          duration: 22,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut" 
        }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] h-[85vw] max-w-[900px] max-h-[900px] rounded-full blur-[48px] [mask-image:radial-gradient(circle,black_35%,transparent_72%)] [-webkit-mask-image:radial-gradient(circle,black_35%,transparent_72%)] will-change-transform gpu-accelerated"
      />

      {/* Bottom-Right Secondary Glow - Continuous Infinite Loop */}
      <motion.div
        animate={{ 
          background: secondaryColors,
          scale: [1, 1.18, 1],
        }}
        transition={{ 
          duration: 26,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut" 
        }}
        className="absolute bottom-10 right-10 w-[65vw] h-[65vw] max-w-[700px] max-h-[700px] rounded-full blur-[48px] [mask-image:radial-gradient(circle,black_35%,transparent_72%)] [-webkit-mask-image:radial-gradient(circle,black_35%,transparent_72%)] will-change-transform gpu-accelerated"
      />

      {/* Dynamic Interactive Mouse Following Glow (Desktop Only) */}
      {isMounted && (
        <motion.div 
          animate={{
            background: glowColors,
            x: mousePos.x - winWidth / 2,
            y: mousePos.y - winHeight / 2,
          }}
          transition={{
            background: { duration: 22, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
            x: { type: "tween", ease: "easeOut", duration: 0.35 },
            y: { type: "tween", ease: "easeOut", duration: 0.35 }
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] rounded-full blur-[40px] [mask-image:radial-gradient(circle,black_35%,transparent_72%)] [-webkit-mask-image:radial-gradient(circle,black_35%,transparent_72%)] will-change-transform pointer-events-none hidden md:block gpu-accelerated"
        />
      )}
    </div>
  );
}
