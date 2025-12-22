import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = "cmjc8mpke00u9js0dxzyjkd9b";

export const PrivyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#10b981",
        },
        loginMethods: ["email", "wallet", "google"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
};
