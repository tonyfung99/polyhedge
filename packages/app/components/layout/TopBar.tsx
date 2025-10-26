"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function TopBar() {
  return (
    <div className="fixed top-0 left-60 right-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Arbitrum Sepolia
          </span>
        </div>
        <ConnectButton
          label="Connect Wallet"
          chainStatus="icon"
          showBalance={{
            smallScreen: false,
            largeScreen: true,
          }}
        />
      </div>
    </div>
  );
}
