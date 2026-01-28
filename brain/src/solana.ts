/**
 * Solana RPC Interaction - Connection and Program Management
 *
 * This module handles:
 * - Solana RPC connection management
 * - Anchor program initialization
 * - Transaction building and sending
 * - PDA derivation for game escrows
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Commitment,
  SendTransactionError,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from '@solana/spl-token';
import { loadWallet, CC_TOKEN_MINT, type BrainWallet } from './wallet.js';

// ============ CONNECTION CONFIG ============

// Network from environment (default to mainnet for safety)
export const NETWORK = (process.env.SOLANA_NETWORK || 'mainnet') as 'mainnet' | 'devnet';

export const RPC_ENDPOINTS = {
  mainnet: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  devnet: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com',
};

export const COMMITMENT: Commitment = 'confirmed';

// Casino program ID (will be set after deployment)
// Devnet program ID will be set after `anchor deploy`
export const CASINO_PROGRAM_ID = new PublicKey(
  process.env.CASINO_PROGRAM_ID || '11111111111111111111111111111111' // Placeholder - update after deploy
);

// ============ CONNECTION MANAGEMENT ============

let _connection: Connection | null = null;

/**
 * Get or create Solana connection
 * Uses SOLANA_NETWORK env var by default
 */
export function getConnection(network: 'mainnet' | 'devnet' = NETWORK): Connection {
  if (!_connection) {
    const endpoint = RPC_ENDPOINTS[network];
    _connection = new Connection(endpoint, {
      commitment: COMMITMENT,
      confirmTransactionInitialTimeout: 60000,
    });
    console.log(`✓ Connected to Solana ${network}: ${endpoint}`);
  }
  return _connection;
}

/**
 * Reset connection (for switching networks)
 */
export function resetConnection(): void {
  _connection = null;
}

// ============ PDA DERIVATION ============

/**
 * Derive game state PDA
 */
export function deriveGameStatePDA(gameSlug: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('game'), Buffer.from(gameSlug)],
    CASINO_PROGRAM_ID
  );
}

/**
 * Derive game escrow PDA (holds $CC tokens)
 */
export function deriveEscrowPDA(gameSlug: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), Buffer.from(gameSlug)],
    CASINO_PROGRAM_ID
  );
}

/**
 * Derive player bet PDA
 */
export function derivePlayerBetPDA(
  gameSlug: string,
  playerWallet: PublicKey,
  roundNumber?: number
): [PublicKey, number] {
  const seeds = [
    Buffer.from('bet'),
    Buffer.from(gameSlug),
    playerWallet.toBuffer(),
  ];

  if (roundNumber !== undefined) {
    const roundBuffer = Buffer.alloc(4);
    roundBuffer.writeUInt32LE(roundNumber);
    seeds.push(roundBuffer);
  }

  return PublicKey.findProgramAddressSync(seeds, CASINO_PROGRAM_ID);
}

/**
 * Derive VRF account PDA
 */
export function deriveVrfPDA(gameSlug: string, roundNumber: number): [PublicKey, number] {
  const roundBuffer = Buffer.alloc(4);
  roundBuffer.writeUInt32LE(roundNumber);

  return PublicKey.findProgramAddressSync(
    [Buffer.from('vrf'), Buffer.from(gameSlug), roundBuffer],
    CASINO_PROGRAM_ID
  );
}

// ============ TRANSACTION HELPERS ============

/**
 * Build a transaction with recent blockhash
 */
export async function buildTransaction(
  connection: Connection,
  feePayer: PublicKey,
  instructions: TransactionInstruction[]
): Promise<Transaction> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(COMMITMENT);

  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = feePayer;

  for (const ix of instructions) {
    tx.add(ix);
  }

  return tx;
}

/**
 * Send and confirm transaction with retry
 */
export async function sendAndConfirmWithRetry(
  connection: Connection,
  wallet: BrainWallet,
  tx: Transaction,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const signature = await wallet.signAndSendTransaction(connection, tx);
      console.log(`✓ Transaction confirmed: ${signature}`);
      return signature;
    } catch (error) {
      lastError = error as Error;
      console.log(`Transaction attempt ${attempt}/${maxRetries} failed:`, lastError.message);

      if (attempt < maxRetries) {
        // Rebuild transaction with fresh blockhash
        const instructions = tx.instructions;
        tx = await buildTransaction(connection, wallet.publicKey, instructions);
        await new Promise(r => setTimeout(r, 2000)); // Wait before retry
      }
    }
  }

  throw lastError || new Error('Transaction failed after max retries');
}

// ============ TOKEN TRANSFER HELPERS ============

/**
 * Transfer $CC tokens from brain wallet to destination
 */
export async function transferCC(
  connection: Connection,
  wallet: BrainWallet,
  destination: PublicKey,
  amount: bigint
): Promise<string> {
  const sourceAta = await getAssociatedTokenAddress(CC_TOKEN_MINT, wallet.publicKey);
  const destAta = await getAssociatedTokenAddress(CC_TOKEN_MINT, destination);

  const instructions: TransactionInstruction[] = [];

  // Check if destination ATA exists
  const destAccount = await connection.getAccountInfo(destAta);
  if (!destAccount) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        destAta,
        destination,
        CC_TOKEN_MINT
      )
    );
  }

  // Transfer tokens
  instructions.push(
    createTransferInstruction(
      sourceAta,
      destAta,
      wallet.publicKey,
      amount
    )
  );

  const tx = await buildTransaction(connection, wallet.publicKey, instructions);
  return sendAndConfirmWithRetry(connection, wallet, tx);
}

/**
 * Transfer SOL from brain wallet
 */
export async function transferSOL(
  connection: Connection,
  wallet: BrainWallet,
  destination: PublicKey,
  lamports: number
): Promise<string> {
  const ix = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: destination,
    lamports,
  });

  const tx = await buildTransaction(connection, wallet.publicKey, [ix]);
  return sendAndConfirmWithRetry(connection, wallet, tx);
}

// ============ GAME INITIALIZATION ============

/**
 * Initialize a new game on-chain
 * This creates the game state PDA and escrow account
 */
export async function initializeGame(
  connection: Connection,
  wallet: BrainWallet,
  gameSlug: string,
  gameType: string,
  config: {
    minBet: bigint;
    maxBet: bigint;
    houseEdgeBps: number;
    platformFeeLamports: bigint;
  }
): Promise<{ gameStatePda: PublicKey; escrowPda: PublicKey; signature: string }> {
  const [gameStatePda] = deriveGameStatePDA(gameSlug);
  const [escrowPda] = deriveEscrowPDA(gameSlug);
  const escrowAta = await getAssociatedTokenAddress(CC_TOKEN_MINT, escrowPda, true);

  // Build initialize instruction
  // Note: This is a placeholder - actual instruction depends on Anchor program
  const initData = Buffer.alloc(100);
  initData.write('initialize_game');
  // TODO: Serialize actual instruction data with Anchor

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: gameStatePda, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: escrowAta, isSigner: false, isWritable: true },
      { pubkey: CC_TOKEN_MINT, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: CASINO_PROGRAM_ID,
    data: initData,
  });

  const tx = await buildTransaction(connection, wallet.publicKey, [ix]);
  const signature = await sendAndConfirmWithRetry(connection, wallet, tx);

  return { gameStatePda, escrowPda, signature };
}

/**
 * Fund game escrow with $CC tokens
 */
export async function fundEscrow(
  connection: Connection,
  wallet: BrainWallet,
  gameSlug: string,
  amount: bigint
): Promise<string> {
  const [escrowPda] = deriveEscrowPDA(gameSlug);
  return transferCC(connection, wallet, escrowPda, amount);
}

// ============ HEALTH CHECK ============

/**
 * Check Solana connection health
 */
export async function checkHealth(): Promise<{
  connected: boolean;
  slot?: number;
  blockTime?: number;
  error?: string;
}> {
  try {
    const connection = getConnection();
    const slot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(slot);

    return {
      connected: true,
      slot,
      blockTime: blockTime || undefined,
    };
  } catch (error) {
    return {
      connected: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Get balance summary for brain wallet
 */
export async function getWalletSummary(): Promise<{
  publicKey: string;
  sol: number;
  cc: number;
} | null> {
  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return null;
  }

  try {
    const connection = getConnection();
    const wallet = loadWallet(encryptionKey);
    const balance = await wallet.getBalance(connection);

    return {
      publicKey: wallet.publicKey.toBase58(),
      sol: balance.sol,
      cc: balance.cc,
    };
  } catch (error) {
    console.error('Failed to get wallet summary:', error);
    return null;
  }
}

// ============ VRF INTEGRATION ============

/**
 * Request VRF randomness for a game round
 * Uses Switchboard VRF
 */
export async function requestVRF(
  connection: Connection,
  wallet: BrainWallet,
  gameSlug: string,
  roundNumber: number
): Promise<{ vrfAccount: PublicKey; signature: string }> {
  const [vrfPda] = deriveVrfPDA(gameSlug, roundNumber);

  // Note: This is a placeholder - actual VRF request uses Switchboard SDK
  // See: https://docs.switchboard.xyz/randomness/vrf

  console.log(`VRF request for game ${gameSlug} round ${roundNumber}`);
  console.log(`VRF PDA: ${vrfPda.toBase58()}`);

  // TODO: Implement actual Switchboard VRF request
  return {
    vrfAccount: vrfPda,
    signature: 'placeholder-signature',
  };
}

/**
 * Read VRF result after callback
 */
export async function readVRFResult(
  connection: Connection,
  vrfAccount: PublicKey
): Promise<{ result: Uint8Array; proof: string } | null> {
  // Note: This is a placeholder - actual VRF result reading uses Switchboard SDK

  const accountInfo = await connection.getAccountInfo(vrfAccount);
  if (!accountInfo) {
    return null;
  }

  // TODO: Parse VRF account data
  return {
    result: new Uint8Array(32),
    proof: 'placeholder-proof',
  };
}

// ============ DEPOSIT VERIFICATION ============

export interface DepositVerification {
  valid: boolean;
  error?: string;
  sender?: string;
  recipient?: string;
  mint?: string;
  amount?: bigint;
  slot?: number;
  blockTime?: number;
}

/**
 * Verify a deposit transaction on-chain
 *
 * This function verifies that:
 * 1. The transaction exists and is confirmed
 * 2. It contains an SPL token transfer instruction
 * 3. The sender matches the expected wallet
 * 4. The recipient is the brain wallet's ATA
 * 5. The amount matches the expected deposit
 * 6. The mint is the $CC token
 *
 * @param connection - Solana connection
 * @param txSignature - Transaction signature to verify
 * @param expectedSender - Expected sender wallet address
 * @param expectedAmount - Expected deposit amount in token lamports (6 decimals)
 * @returns Verification result with parsed data
 */
export async function verifyDepositTransaction(
  connection: Connection,
  txSignature: string,
  expectedSender: string,
  expectedAmount: bigint
): Promise<DepositVerification> {
  try {
    // Fetch the parsed transaction
    const tx = await connection.getParsedTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, error: 'Transaction not found or not confirmed' };
    }

    // Check if transaction succeeded
    if (tx.meta?.err) {
      return { valid: false, error: `Transaction failed: ${JSON.stringify(tx.meta.err)}` };
    }

    // Get the brain wallet's ATA for $CC
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    if (!encryptionKey) {
      return { valid: false, error: 'Server wallet not configured' };
    }

    const brainWallet = loadWallet(encryptionKey);
    const brainAta = await getAssociatedTokenAddress(CC_TOKEN_MINT, brainWallet.publicKey);

    // Parse inner instructions to find the token transfer
    // SPL transfers show up as parsed instructions with type 'transfer' or 'transferChecked'
    let foundTransfer: {
      source: string;
      destination: string;
      amount: string;
      mint?: string;
      authority: string;
    } | null = null;

    // Check main instructions
    for (const ix of tx.transaction.message.instructions) {
      if ('parsed' in ix && ix.program === 'spl-token') {
        const parsed = ix.parsed as {
          type: string;
          info: {
            source?: string;
            destination?: string;
            amount?: string;
            tokenAmount?: { amount: string };
            mint?: string;
            authority?: string;
          };
        };

        if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
          const info = parsed.info;
          foundTransfer = {
            source: info.source || '',
            destination: info.destination || '',
            amount: info.amount || info.tokenAmount?.amount || '0',
            mint: info.mint,
            authority: info.authority || '',
          };
          break;
        }
      }
    }

    // Also check inner instructions (for ATA creation + transfer combo)
    if (!foundTransfer && tx.meta?.innerInstructions) {
      for (const innerIxSet of tx.meta.innerInstructions) {
        for (const ix of innerIxSet.instructions) {
          if ('parsed' in ix && ix.program === 'spl-token') {
            const parsed = ix.parsed as {
              type: string;
              info: {
                source?: string;
                destination?: string;
                amount?: string;
                tokenAmount?: { amount: string };
                mint?: string;
                authority?: string;
              };
            };

            if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
              const info = parsed.info;
              foundTransfer = {
                source: info.source || '',
                destination: info.destination || '',
                amount: info.amount || info.tokenAmount?.amount || '0',
                mint: info.mint,
                authority: info.authority || '',
              };
              break;
            }
          }
        }
        if (foundTransfer) break;
      }
    }

    if (!foundTransfer) {
      return { valid: false, error: 'No SPL token transfer found in transaction' };
    }

    // Verify the transfer details
    const transferAmount = BigInt(foundTransfer.amount);

    // Get the sender's ATA to verify authority
    const senderPubkey = new PublicKey(expectedSender);
    const senderAta = await getAssociatedTokenAddress(CC_TOKEN_MINT, senderPubkey);

    // Verify sender (either the ATA matches source, or authority matches sender)
    const senderMatches =
      foundTransfer.source === senderAta.toBase58() ||
      foundTransfer.authority === expectedSender;

    if (!senderMatches) {
      return {
        valid: false,
        error: `Sender mismatch: expected ${expectedSender}, got authority ${foundTransfer.authority}`,
        sender: foundTransfer.authority,
        recipient: foundTransfer.destination,
        amount: transferAmount,
      };
    }

    // Verify recipient is brain wallet's ATA
    if (foundTransfer.destination !== brainAta.toBase58()) {
      return {
        valid: false,
        error: `Recipient mismatch: expected brain ATA ${brainAta.toBase58()}, got ${foundTransfer.destination}`,
        sender: foundTransfer.authority,
        recipient: foundTransfer.destination,
        amount: transferAmount,
      };
    }

    // Verify amount matches
    if (transferAmount !== expectedAmount) {
      return {
        valid: false,
        error: `Amount mismatch: expected ${expectedAmount}, got ${transferAmount}`,
        sender: foundTransfer.authority,
        recipient: foundTransfer.destination,
        amount: transferAmount,
      };
    }

    // Verify mint if available (for transferChecked)
    if (foundTransfer.mint && foundTransfer.mint !== CC_TOKEN_MINT.toBase58()) {
      return {
        valid: false,
        error: `Wrong token mint: expected ${CC_TOKEN_MINT.toBase58()}, got ${foundTransfer.mint}`,
        sender: foundTransfer.authority,
        recipient: foundTransfer.destination,
        mint: foundTransfer.mint,
        amount: transferAmount,
      };
    }

    // All checks passed!
    return {
      valid: true,
      sender: foundTransfer.authority,
      recipient: foundTransfer.destination,
      mint: CC_TOKEN_MINT.toBase58(),
      amount: transferAmount,
      slot: tx.slot,
      blockTime: tx.blockTime || undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Get the brain wallet's native SOL address
 * Used for collecting platform fees (in SOL)
 */
export function getBrainWalletSolAddress(): string | null {
  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return null;
  }

  try {
    const brainWallet = loadWallet(encryptionKey);
    return brainWallet.publicKey.toBase58();
  } catch (error) {
    console.error('Failed to get brain wallet SOL address:', error);
    return null;
  }
}

/**
 * Verify a SOL transfer transaction on-chain
 *
 * This function verifies that:
 * 1. The transaction exists and is confirmed
 * 2. It contains a SOL transfer to the brain wallet
 * 3. The amount is at least the expected fee
 *
 * @param connection - Solana connection
 * @param txSignature - Transaction signature to verify
 * @param expectedMinAmount - Minimum expected SOL amount in lamports
 * @returns Verification result
 */
export async function verifySolFeeTransaction(
  connection: Connection,
  txSignature: string,
  expectedMinAmount: number
): Promise<{ valid: boolean; amount?: number; error?: string }> {
  try {
    const encryptionKey = process.env.BRAIN_WALLET_KEY;
    if (!encryptionKey) {
      return { valid: false, error: 'Server wallet not configured' };
    }

    const brainWallet = loadWallet(encryptionKey);
    const brainAddress = brainWallet.publicKey.toBase58();

    // Fetch the parsed transaction
    const tx = await connection.getParsedTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, error: 'Transaction not found or not confirmed' };
    }

    // Check if transaction succeeded
    if (tx.meta?.err) {
      return { valid: false, error: `Transaction failed: ${JSON.stringify(tx.meta.err)}` };
    }

    // Look for SOL transfer to brain wallet in pre/post balances
    const accountKeys = tx.transaction.message.accountKeys.map(k =>
      typeof k === 'string' ? k : k.pubkey.toBase58()
    );

    const brainIndex = accountKeys.indexOf(brainAddress);
    if (brainIndex === -1) {
      // Brain wallet not in transaction - check inner instructions for system transfer
      let foundSolTransfer = false;
      let transferAmount = 0;

      for (const ix of tx.transaction.message.instructions) {
        if ('parsed' in ix && ix.program === 'system') {
          const parsed = ix.parsed as {
            type: string;
            info: {
              source?: string;
              destination?: string;
              lamports?: number;
            };
          };

          if (parsed.type === 'transfer' && parsed.info.destination === brainAddress) {
            foundSolTransfer = true;
            transferAmount = parsed.info.lamports || 0;
            break;
          }
        }
      }

      if (!foundSolTransfer) {
        return { valid: false, error: 'No SOL transfer to brain wallet found in transaction' };
      }

      if (transferAmount < expectedMinAmount) {
        return {
          valid: false,
          error: `SOL fee too low: expected ${expectedMinAmount} lamports, got ${transferAmount}`,
          amount: transferAmount,
        };
      }

      return { valid: true, amount: transferAmount };
    }

    // Calculate SOL received by brain wallet from pre/post balances
    const preBal = tx.meta?.preBalances?.[brainIndex] || 0;
    const postBal = tx.meta?.postBalances?.[brainIndex] || 0;
    const received = postBal - preBal;

    if (received < expectedMinAmount) {
      return {
        valid: false,
        error: `SOL fee too low: expected ${expectedMinAmount} lamports, got ${received}`,
        amount: received,
      };
    }

    return { valid: true, amount: received };
  } catch (error) {
    return {
      valid: false,
      error: `SOL verification failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Get the brain wallet's ATA address for $CC
 * Used by frontend to know where to send deposits
 *
 * IMPORTANT: This function also ensures the ATA exists on-chain.
 * If the ATA doesn't exist, it will be created (brain wallet pays rent).
 */
export async function getBrainWalletAta(): Promise<string | null> {
  const encryptionKey = process.env.BRAIN_WALLET_KEY;
  if (!encryptionKey) {
    return null;
  }

  try {
    const connection = getConnection();
    const brainWallet = loadWallet(encryptionKey);
    const ata = await getAssociatedTokenAddress(CC_TOKEN_MINT, brainWallet.publicKey);

    // Check if ATA exists on-chain
    const accountInfo = await connection.getAccountInfo(ata);
    if (!accountInfo) {
      // ATA doesn't exist - create it
      console.log('[Solana] Brain wallet ATA for $CC does not exist, creating...');
      console.log('[Solana] Brain wallet:', brainWallet.publicKey.toBase58());
      console.log('[Solana] ATA address:', ata.toBase58());
      console.log('[Solana] $CC mint:', CC_TOKEN_MINT.toBase58());

      const createAtaIx = createAssociatedTokenAccountInstruction(
        brainWallet.publicKey,  // payer (brain wallet pays rent ~0.002 SOL)
        ata,                     // ata address to create
        brainWallet.publicKey,  // owner of the new ATA
        CC_TOKEN_MINT           // token mint
      );

      const tx = await buildTransaction(connection, brainWallet.publicKey, [createAtaIx]);
      const signature = await sendAndConfirmWithRetry(connection, brainWallet, tx);
      console.log('[Solana] Brain wallet ATA created successfully!');
      console.log('[Solana] Transaction:', signature);
    }

    return ata.toBase58();
  } catch (error) {
    console.error('Failed to get/create brain wallet ATA:', error);
    return null;
  }
}
