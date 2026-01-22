// Croissant browser wallet provider types (window.linera)

export interface QueryRequest {
  type: 'QUERY';
  applicationId: string;
  query: string;
}

export interface AssignmentRequest {
  type: 'ASSIGNMENT';
  chainId: string;
  timestamp: string;
}

export interface ConnectRequest {
  type: 'CONNECT_WALLET';
}

export type WalletRequest = QueryRequest | AssignmentRequest | ConnectRequest;

export interface WalletResponse {
  id: string;
  result?: any;
  error?: string;
}

export interface LineraProvider {
  request(request: WalletRequest): Promise<WalletResponse>;
  on(event: 'notification', callback: (data: any) => void): void;
  off(event: 'notification', callback: (data: any) => void): void;
}

declare global {
  interface Window {
    linera?: LineraProvider;
  }
}

export function isCroissantInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.linera;
}

export async function connectCroissant(): Promise<string | null> {
  if (!isCroissantInstalled()) {
    throw new Error('Croissant wallet extension not installed');
  }

  const response = await window.linera!.request({ type: 'CONNECT_WALLET' });
  
  if (response.error) {
    throw new Error(response.error);
  }

  // Response contains wallet info including chainId
  return response.result?.chainId || response.result?.chain_id || null;
}

export async function requestChainAssignment(chainId: string): Promise<WalletResponse> {
  if (!isCroissantInstalled()) {
    throw new Error('Croissant wallet extension not installed');
  }

  return window.linera!.request({
    type: 'ASSIGNMENT',
    chainId,
    timestamp: Date.now().toString(),
  });
}

export async function queryApplication(applicationId: string, query: string): Promise<any> {
  if (!isCroissantInstalled()) {
    throw new Error('Croissant wallet extension not installed');
  }

  const response = await window.linera!.request({
    type: 'QUERY',
    applicationId,
    query,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  return response.result;
}

export function onWalletNotification(callback: (data: any) => void): () => void {
  if (!isCroissantInstalled()) {
    return () => {};
  }

  window.linera!.on('notification', callback);
  return () => window.linera!.off('notification', callback);
}
