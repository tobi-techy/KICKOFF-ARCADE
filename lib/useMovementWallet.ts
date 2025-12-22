import { usePrivy, useWallets } from "@privy-io/react-auth";
import { movementClient, MOVEMENT_CONFIG } from "./movement";
import {
  AccountAddress,
  AccountAuthenticatorEd25519,
  Ed25519PublicKey,
  Ed25519Signature,
  generateSigningMessageForTransaction,
} from "@aptos-labs/ts-sdk";
import { toHex } from "viem";

export const useMovementWallet = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  // Get the embedded wallet
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  const getAddress = () => {
    if (!embeddedWallet) return null;
    return embeddedWallet.address;
  };

  const signAndSubmitTransaction = async (payload: {
    function: string;
    typeArguments?: string[];
    functionArguments: any[];
  }) => {
    if (!embeddedWallet) throw new Error("No wallet connected");

    const address = AccountAddress.from(embeddedWallet.address);

    // Build transaction
    const rawTxn = await movementClient.transaction.build.simple({
      sender: address,
      data: {
        function: payload.function as `${string}::${string}::${string}`,
        typeArguments: payload.typeArguments || [],
        functionArguments: payload.functionArguments,
      },
    });

    // Get signing message
    const message = generateSigningMessageForTransaction(rawTxn);
    const messageHex = toHex(message);

    // Sign with Privy (raw sign)
    const provider = await embeddedWallet.getEthereumProvider();
    const signature = await provider.request({
      method: "personal_sign",
      params: [messageHex, embeddedWallet.address],
    });

    // Create authenticator and submit
    const senderAuthenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(embeddedWallet.address),
      new Ed25519Signature((signature as string).slice(2))
    );

    const pending = await movementClient.transaction.submit.simple({
      transaction: rawTxn,
      senderAuthenticator,
    });

    return movementClient.waitForTransaction({ transactionHash: pending.hash });
  };

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
    wallet: embeddedWallet,
    address: getAddress(),
    signAndSubmitTransaction,
    chainConfig: MOVEMENT_CONFIG,
  };
};
