"use client";

import { useEffect, useRef, useCallback } from "react";

interface InteractiveGridProps {
  className?: string;
}

export function InteractiveGrid({ className = "" }: InteractiveGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);
  const dotsRef = useRef<{ x: number; y: number; baseOpacity: number }[]>([]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    // Grid configuration
    const DOT_SPACING = 28;
    const DOT_RADIUS = 1.6;
    const PROXIMITY_RADIUS = 150;
    const CONNECTION_RADIUS = 120;
    const BASE_COLOR = { r: 180, g: 195, b: 215 }; // visible slate
    const ACTIVE_COLOR = { r: 37, g: 99, b: 235 }; // blue-600
    const GLOW_COLOR = { r: 59, g: 130, b: 246 }; // blue-500

    function buildGrid() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const dots: { x: number; y: number; baseOpacity: number }[] = [];

      const cols = Math.ceil(w / DOT_SPACING) + 1;
      const rows = Math.ceil(h / DOT_SPACING) + 1;
      const offsetX = (w - (cols - 1) * DOT_SPACING) / 2;
      const offsetY = (h - (rows - 1) * DOT_SPACING) / 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          dots.push({
            x: offsetX + col * DOT_SPACING,
            y: offsetY + row * DOT_SPACING,
            baseOpacity: 0.4 + Math.random() * 0.15,
          });
        }
      }

      dotsRef.current = dots;
    }

    function resize() {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const mouse = mouseRef.current;
      const dots = dotsRef.current;

      ctx.clearRect(0, 0, w, h);

      // Track activated dots for connection lines
      const activeDots: { x: number; y: number; strength: number }[] = [];

      // Draw dots
      for (const dot of dots) {
        const dx = mouse.x - dot.x;
        const dy = mouse.y - dot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Calculate proximity strength (1 = on top of mouse, 0 = out of range)
        const strength = Math.max(0, 1 - dist / PROXIMITY_RADIUS);
        const eased = strength * strength; // ease-in for smoother falloff

        if (eased > 0.05) {
          activeDots.push({ x: dot.x, y: dot.y, strength: eased });
        }

        // Interpolate color
        const r = Math.round(BASE_COLOR.r + (ACTIVE_COLOR.r - BASE_COLOR.r) * eased);
        const g = Math.round(BASE_COLOR.g + (ACTIVE_COLOR.g - BASE_COLOR.g) * eased);
        const b = Math.round(BASE_COLOR.b + (ACTIVE_COLOR.b - BASE_COLOR.b) * eased);

        // Scale dot size with proximity
        const scale = 1 + eased * 2.5;
        const opacity = dot.baseOpacity + eased * (1 - dot.baseOpacity);

        // Draw glow for active dots
        if (eased > 0.2) {
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, DOT_RADIUS * scale * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${GLOW_COLOR.r}, ${GLOW_COLOR.g}, ${GLOW_COLOR.b}, ${eased * 0.18})`;
          ctx.fill();
        }

        // Draw dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_RADIUS * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.fill();
      }

      // Draw connection lines between nearby active dots
      if (activeDots.length > 1) {
        for (let i = 0; i < activeDots.length; i++) {
          for (let j = i + 1; j < activeDots.length; j++) {
            const a = activeDots[i];
            const b = activeDots[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONNECTION_RADIUS) {
              const lineStrength = (1 - dist / CONNECTION_RADIUS) * Math.min(a.strength, b.strength);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `rgba(${ACTIVE_COLOR.r}, ${ACTIVE_COLOR.g}, ${ACTIVE_COLOR.b}, ${lineStrength * 0.35})`;
              ctx.lineWidth = lineStrength * 2;
              ctx.stroke();
            }
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    // Listen on window so it works even behind pointer-events-none
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
