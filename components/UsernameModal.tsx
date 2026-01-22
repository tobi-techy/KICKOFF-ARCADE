import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Loader2 } from "lucide-react";

interface UsernameModalProps {
  onSubmit: (username: string) => Promise<void>;
  loading: boolean;
}

export const UsernameModal: React.FC<UsernameModalProps> = ({ onSubmit, loading }) => {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length >= 3) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-black border-2 border-blue-500/30 rounded-2xl p-8 max-w-md w-full"
      >
        <div className="flex items-center gap-3 mb-6">
          <User className="w-8 h-8 text-blue-400" />
          <h2 className="text-2xl font-black text-white">Choose Username</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={20}
              className="w-full px-4 py-3 bg-gray-800/50 border-2 border-blue-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-2">
              {username.length}/20 characters (min 3)
            </p>
          </div>

          <button
            type="submit"
            disabled={username.trim().length < 3 || loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Registering...
              </>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
