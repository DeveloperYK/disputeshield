"use client";

export function InteractiveGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Blue orb — top right */}
      <div
        className="absolute -top-16 -right-16 w-[350px] h-[350px] rounded-full animate-[drift_20s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.5) 0%, rgba(59,130,246,0.2) 40%, transparent 70%)",
        }}
      />
      {/* Purple orb — bottom left */}
      <div
        className="absolute -bottom-12 -left-12 w-[300px] h-[300px] rounded-full animate-[drift_25s_ease-in-out_infinite_reverse]"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(59,130,246,0.15) 40%, transparent 70%)",
        }}
      />
      {/* Accent orb — mid left */}
      <div
        className="absolute top-1/3 -left-8 w-[250px] h-[250px] rounded-full animate-[drift_18s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(59,130,246,0.1) 40%, transparent 65%)",
        }}
      />
    </div>
  );
}
