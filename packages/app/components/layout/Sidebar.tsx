"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";

const navItems = [
  {
    label: "Home",
    href: "/",
    icon: Home,
  },
  {
    label: "Strategies",
    href: "/strategies",
    icon: TrendingUp,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Wallet,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  return (
    <div className="fixed left-0 top-0 bottom-0 w-60 border-r border-sidebar-border bg-sidebar z-30">
      <nav className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-sidebar-border">
          <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground">
            POLYHEDGE
          </h1>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User Info */}
        {isConnected && address && (
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 ring-2 ring-sidebar-border" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground">
                  Connected
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
