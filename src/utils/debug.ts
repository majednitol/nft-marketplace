// Debug utilities for troubleshooting marketplace issues

export const debugMarketplaceState = () => {
  console.group('🔍 Marketplace Debug Info');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('- VITE_PROGRAM_ID:', import.meta.env.VITE_PROGRAM_ID);
  console.log('- VITE_SOLANA_NETWORK:', import.meta.env.VITE_SOLANA_NETWORK);
  console.log('- VITE_SOLANA_RPC_URL:', import.meta.env.VITE_SOLANA_RPC_URL);
  
  // Check browser location
  console.log('\nBrowser Info:');
  console.log('- URL:', window.location.href);
  console.log('- User Agent:', navigator.userAgent);
  
  // Check wallet availability
  console.log('\nWallet Detection:');
  const phantomWallet = (window as any).phantom?.solana;
  const solflareWallet = (window as any).solflare;
  console.log('- Phantom available:', !!phantomWallet);
  console.log('- Solflare available:', !!solflareWallet);
  
  console.groupEnd();
};

export const debugConnectionState = (connection: any, publicKey: any, program: any) => {
  console.group('🔗 Connection State Debug');
  
  console.log('Connection:', {
    endpoint: connection?._rpcEndpoint,
    commitment: connection?.commitment,
    connected: !!connection,
  });
  
  console.log('Wallet:', {
    connected: !!publicKey,
    address: publicKey?.toBase58(),
  });
  
  console.log('Program:', {
    available: !!program,
    programId: program?.programId?.toBase58(),
    provider: !!program?.provider,
  });
  
  console.groupEnd();
};

export const debugError = (error: any, context: string) => {
  console.group(`❌ Error in ${context}`);
  
  console.log('Error message:', error?.message);
  console.log('Error code:', error?.code);
  console.log('Error logs:', error?.logs);
  console.log('Full error:', error);
  
  // Common error patterns
  const errorMsg = error?.message?.toLowerCase() || '';
  if (errorMsg.includes('account does not exist')) {
    console.log('💡 Suggestion: The marketplace account may not be initialized yet.');
  } else if (errorMsg.includes('program')) {
    console.log('💡 Suggestion: Check if the Solana program is deployed on the current network.');
  } else if (errorMsg.includes('timeout')) {
    console.log('💡 Suggestion: Try refreshing or check your internet connection.');
  }
  
  console.groupEnd();
};

// Auto-run debug on load in development
if (import.meta.env.DEV) {
  console.log('🚀 NFT Marketplace Debug Mode Enabled');
  setTimeout(debugMarketplaceState, 1000);
}