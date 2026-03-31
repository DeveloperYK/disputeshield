"use client";

export function InteractiveGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Large blue gradient orb — top right */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full animate-[drift_20s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(59,130,246,0.05) 50%, transparent 70%)",
        }}
      />
      {/* Smaller orb — bottom left */}
      <div
        className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full animate-[drift_25s_ease-in-out_infinite_reverse]"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(59,130,246,0.04) 50%, transparent 70%)",
        }}
      />
      {/* Accent orb — mid left */}
      <div
        className="absolute top-1/3 -left-16 w-[300px] h-[300px] rounded-full animate-[drift_18s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
