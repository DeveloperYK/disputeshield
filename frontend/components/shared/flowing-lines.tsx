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

    // Two lines that twist around each other like a double helix
    const lines = [
      { progress: 0, speed: 0.005 },
      { progress: 0, speed: 0.004 },
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

    function getHelixPoint(t: number, w: number, h: number, lineIndex: number) {
      // Base path: bottom-left corner to top-right corner
      // Offset so lines stay in the left/bottom edges, away from center
      const startX = -60;
      const startY = h * 1.1;
      const endX = w * 0.35;
      const endY = -h * 0.1;

      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;

      // Helix twist — the two lines orbit around the base path
      // They're 180 degrees apart so they weave around each other
      const twistFreq = 6; // number of full twists
      const twistRadius = 35 + Math.sin(t * Math.PI) * 20; // wider in the middle
      const angle = t * Math.PI * 2 * twistFreq + (lineIndex * Math.PI); // offset by 180deg

      // Perpendicular offset (twist happens perpendicular to the path direction)
      const pathAngle = Math.atan2(endY - startY, endX - startX);
      const perpX = Math.cos(pathAngle + Math.PI / 2);
      const perpY = Math.sin(pathAngle + Math.PI / 2);

      const offsetX = Math.sin(angle) * twistRadius * perpX;
      const offsetY = Math.sin(angle) * twistRadius * perpY;

      return {
        x: baseX + offsetX,
        y: baseY + offsetY,
      };
    }

    function drawHelixLine(
      w: number,
      h: number,
      progress: number,
      lineIndex: number
    ) {
      if (!ctx || progress <= 0) return;

      const steps = 300;
      const stepsToRender = Math.floor(steps * Math.min(progress, 1));
      if (stepsToRender < 2) return;

      // Main thick line
      ctx.beginPath();
      ctx.strokeStyle = lineIndex === 0
        ? "rgba(37, 99, 235, 0.55)"   // bright blue
        : "rgba(59, 130, 246, 0.45)";  // slightly lighter blue
      ctx.lineWidth = lineIndex === 0 ? 6 : 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i <= stepsToRender; i++) {
        const t = i / steps;
        const pt = getHelixPoint(t, w, h, lineIndex);

        if (i === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();

      // Glow layer
      ctx.beginPath();
      ctx.strokeStyle = lineIndex === 0
        ? "rgba(96, 165, 250, 0.2)"
        : "rgba(147, 197, 253, 0.15)";
      ctx.lineWidth = lineIndex === 0 ? 14 : 12;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i <= stepsToRender; i++) {
        const t = i / steps;
        const pt = getHelixPoint(t, w, h, lineIndex);

        if (i === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();
    }

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      let anyAnimating = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.progress < 1) {
          line.progress += line.speed;
          if (line.progress > 1) line.progress = 1;
          anyAnimating = true;
        }

        drawHelixLine(w, h, line.progress, i);
      }

      if (anyAnimating) {
        animationId = requestAnimationFrame(draw);
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
