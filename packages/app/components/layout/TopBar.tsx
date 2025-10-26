"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function TopBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-end px-6">
        <ConnectButton
          label="Connect Wallet"
          chainStatus="name"
          showBalance={{
            smallScreen: false,
            largeScreen: true,
          }}
        />
      </div>
    </div>
  );
}
