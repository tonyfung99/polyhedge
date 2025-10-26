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
    <div className="fixed left-0 top-16 bottom-0 w-60 border-r bg-muted/10">
      <nav className="flex flex-col h-full">
        {/* Navigation Links */}
        <div className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User Info */}
        {isConnected && address && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Connected</p>
                <p className="text-xs text-muted-foreground truncate">
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
