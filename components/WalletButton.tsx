import React from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Wallet, LogOut } from "lucide-react";

export const WalletButton: React.FC = () => {
  let privyState = { ready: false, authenticated: false, user: null as any, login: () => {}, logout: () => {} };
  
  try {
    privyState = usePrivy();
  } catch (e) {
    // Privy not available
    return null;
  }

  const { ready, authenticated, user, login, logout } = privyState;

  if (!ready) {
    return (
      <button className="px-4 py-2 bg-slate-700 rounded-xl text-white/50 text-sm">
        Loading...
      </button>
    );
  }

  if (authenticated && user) {
    const address = user.wallet?.address;
    const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected";

    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          {shortAddress}
        </div>
        <button
          onClick={logout}
          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white/70 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/25"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
};
