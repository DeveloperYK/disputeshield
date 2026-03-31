"use client";

import { useEffect, useRef } from "react";

interface FlowingLinesProps {
  className?: string;
}

export function FlowingLines({ className = "" }: FlowingLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let dpr = window.devicePixelRatio || 1;

    // Each line tracks its own progress (0 = not started, 1 = fully drawn & frozen)
    const lines = [
      { progress: 0, speed: 0.004, width: 4, opacity: 0.35, offsetY: 0 },
      { progress: 0, speed: 0.003, width: 3.5, opacity: 0.25, offsetY: 0.12 },
    ];

    function resize() {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    // Generate a flowing path from bottom-left to top-right with gentle waves
    function drawLine(
      w: number,
      h: number,
      progress: number,
      lineWidth: number,
      opacity: number,
      yOffset: number
    ) {
      if (!ctx || progress <= 0) return;

      // Path goes from bottom-left to top-right
      const startX = -20;
      const startY = h + 40;
      const endX = w + 20;
      const endY = -40;

      const totalLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      const drawLength = totalLength * Math.min(progress, 1);

      // How many steps to draw
      const steps = 200;
      const stepsToRender = Math.floor(steps * Math.min(progress, 1));

      if (stepsToRender < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i <= stepsToRender; i++) {
        const t = i / steps;

        // Linear interpolation for base position (bottom-left to top-right)
        const baseX = startX + (endX - startX) * t;
        const baseY = startY + (endY - startY) * t + yOffset * h;

        // Add gentle sine wave for organic flowing feel
        const wave1 = Math.sin(t * Math.PI * 2.5) * 30;
        const wave2 = Math.sin(t * Math.PI * 4 + 1.2) * 15;

        const x = baseX + wave1 * 0.3;
        const y = baseY + wave1 + wave2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Draw a subtle glow version underneath
      ctx.beginPath();
      ctx.strokeStyle = `rgba(96, 165, 250, ${opacity * 0.4})`;
      ctx.lineWidth = lineWidth * 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i <= stepsToRender; i++) {
        const t = i / steps;
        const baseX = startX + (endX - startX) * t;
        const baseY = startY + (endY - startY) * t + yOffset * h;
        const wave1 = Math.sin(t * Math.PI * 2.5) * 30;
        const wave2 = Math.sin(t * Math.PI * 4 + 1.2) * 15;
        const x = baseX + wave1 * 0.3;
        const y = baseY + wave1 + wave2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    let allFrozen = false;

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      let anyAnimating = false;

      for (const line of lines) {
        if (line.progress < 1) {
          line.progress += line.speed;
          if (line.progress > 1) line.progress = 1;
          anyAnimating = true;
        }

        drawLine(w, h, line.progress, line.width, line.opacity, line.offsetY);
      }

      if (anyAnimating) {
        animationId = requestAnimationFrame(draw);
      } else {
        allFrozen = true;
        // Final render, then stop
      }
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
