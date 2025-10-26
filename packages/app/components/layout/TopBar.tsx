"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function TopBar() {
  return (
    <div className="fixed top-0 left-60 right-0 z-50 h-16 border-b bg-background">
      <div className="flex h-full items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          POLYHEDGE
        </Link>
        <div className="flex items-center">
          <ConnectButton />
        </div>
      </div>
    </div>
  );
}
