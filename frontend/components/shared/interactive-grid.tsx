"use client";

export function InteractiveGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Large blue gradient orb — top right */}
      <div
        className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full animate-[drift_20s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.4) 0%, rgba(59,130,246,0.15) 40%, transparent 70%)",
        }}
      />
      {/* Smaller orb — bottom left */}
      <div
        className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full animate-[drift_25s_ease-in-out_infinite_reverse]"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(59,130,246,0.1) 40%, transparent 70%)",
        }}
      />
      {/* Accent orb — mid left */}
      <div
        className="absolute top-1/3 -left-20 w-[450px] h-[450px] rounded-full animate-[drift_18s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(59,130,246,0.08) 40%, transparent 65%)",
        }}
      />
    </div>
  );
}
