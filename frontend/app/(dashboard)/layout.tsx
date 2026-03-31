"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Inbox,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", icon: Inbox, label: "Disputes" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <TooltipProvider delay={0}>
      <div className="min-h-screen flex bg-background">
        {/* Nav Rail */}
        <nav className="fixed left-0 top-0 bottom-0 w-16 bg-card border-r border-border flex flex-col items-center py-4 z-40">
          <Link href="/dashboard" className="mb-8">
            <Shield className="w-7 h-7 text-primary" />
          </Link>

          <div className="flex flex-col items-center gap-1 flex-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));
              const isDashboardActive =
                item.href === "/dashboard" &&
                (pathname === "/dashboard" ||
                  pathname.startsWith("/disputes"));

              const active = isActive || isDashboardActive;

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger
                    render={
                      <Link
                        href={item.href}
                        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          active
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      />
                    }
                  >
                    {active && (
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-primary/10"
                        layoutId="nav-active"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                    <item.icon className="w-5 h-5 relative z-10" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <Tooltip>
            <TooltipTrigger
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </TooltipTrigger>
            <TooltipContent side="right">Log out</TooltipContent>
          </Tooltip>
        </nav>

        {/* Main content */}
        <main className="flex-1 ml-16 relative overflow-hidden">
          {/* Animated flowing blue lines background */}
          <div className="fixed inset-0 ml-16 pointer-events-none overflow-hidden">
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.04]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="flow-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
                  <stop offset="50%" stopColor="var(--primary)" stopOpacity="1" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="flow-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M-100,200 C200,100 400,300 600,180 S1000,250 1200,150 S1600,200 1900,100"
                fill="none"
                stroke="url(#flow-grad-1)"
                strokeWidth="1.5"
                className="animate-flow-1"
              />
              <path
                d="M-100,400 C150,350 350,450 550,380 S850,420 1100,350 S1400,400 1900,300"
                fill="none"
                stroke="url(#flow-grad-2)"
                strokeWidth="1"
                className="animate-flow-2"
              />
              <path
                d="M-100,600 C250,550 450,650 700,580 S950,620 1200,560 S1500,600 1900,500"
                fill="none"
                stroke="url(#flow-grad-1)"
                strokeWidth="1"
                className="animate-flow-3"
              />
              <path
                d="M-100,800 C300,750 500,850 750,780 S1050,820 1300,760 S1600,800 1900,700"
                fill="none"
                stroke="url(#flow-grad-2)"
                strokeWidth="0.8"
                className="animate-flow-1"
              />
            </svg>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="min-h-screen relative"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </TooltipProvider>
  );
}
