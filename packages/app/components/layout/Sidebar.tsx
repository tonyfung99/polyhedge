"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@rainbow-me/rainbowkit";

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

  return (
    <div className="sticky top-0 h-screen w-60 border-r border-sidebar-border bg-sidebar z-30 flex-shrink-0">
      <nav className="flex flex-col h-full pt-4">
        <div className="px-6 py-4 border-b border-sidebar-border flex justify-center">
          <Image
            src="/polyhedge_logo.png"
            alt="PolyHedge"
            width={180}
            height={60}
            priority
          />
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

        {/* Connect Wallet Button */}
        <div className="border-t border-sidebar-border p-4">
          <ConnectButton
            label="Connect Wallet"
            chainStatus="name"
            showBalance={{
              smallScreen: false,
              largeScreen: true,
            }}
          />
        </div>
      </nav>
    </div>
  );
}
