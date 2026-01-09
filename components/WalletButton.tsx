import React from "react";
import { useLineraWallet } from "../lib/useLineraWallet";
import { Wallet, LogOut } from "lucide-react";

export const WalletButton: React.FC = () => {
  const { ready, authenticated, chainId, loading, login, logout } = useLineraWallet();

  if (!ready || loading) {
    return (
      <button className="px-4 py-2 bg-slate-700 rounded-xl text-white/50 text-sm">
        {loading ? "Connecting..." : "Loading..."}
      </button>
    );
  }

  if (authenticated && chainId) {
    const shortAddress = `${chainId.slice(0, 6)}...${chainId.slice(-4)}`;

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
