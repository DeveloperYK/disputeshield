"use client";

export function InteractiveGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Single atmospheric blue glow behind the form */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-[glow-pulse_8s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(59,130,246,0.03) 40%, transparent 65%)",
        }}
      />
    </div>
  );
}
