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
import { InteractiveGrid } from "@/components/shared/interactive-grid";
import { SupportWidget } from "@/components/shared/support-widget";
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
          <div className="fixed inset-0 ml-16 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            <InteractiveGrid />
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
        <SupportWidget />
      </div>
    </TooltipProvider>
  );
}
