/**
 * Brain Wallet - Solana Wallet Management for GameFi Agent
 *
 * This module manages the brain's Solana wallet for:
 * - Funding game escrows
 * - Paying transaction fees
 * - Distributing rewards
 *
 * SECURITY:
 * - Keypair encrypted at rest using tweetnacl-sealedbox pattern
 * - Environment variable for encryption key
 * - Max withdrawal limits per day
 * - Alert on unusual activity
 */

import { Keypair, PublicKey, Connection, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { db } from './db.js';

// $CC Token mint address (network-aware)
// Devnet: Created for testing with 1B supply, brain wallet is mint authority
// Mainnet: The real $CC token
const MAINNET_CC_MINT = 'Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS';
const DEVNET_CC_MINT = process.env.DEVNET_CC_MINT || 'GzoMpC5ywKJzHsKmHBepHUXBP72V9QMtVBqus3egCDe9';

export const CC_TOKEN_MINT = new PublicKey(
  process.env.SOLANA_NETWORK === 'devnet' ? DEVNET_CC_MINT : MAINNET_CC_MINT
);

// Encryption constants
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface WalletBalance {
  sol: number;
  cc: number;
  solLamports: bigint;
  ccLamports: bigint;
}

export interface WalletState {
  publicKey: string;
  solBalance: number;
  ccBalance: number;
  totalDistributed: number;
  lastSync: string | null;
}

export interface BrainWallet {
  publicKey: PublicKey;
  keypair: Keypair;
  getBalance: (connection: Connection) => Promise<WalletBalance>;
  signTransaction: (tx: Transaction) => Transaction;
  signAndSendTransaction: (connection: Connection, tx: Transaction) => Promise<string>;
}

/**
 * Encrypt a keypair's secret key for storage
 */
function encryptKeypair(secretKey: Uint8Array, encryptionKey: string): Buffer {
  // Derive a 32-byte key from the password
  const key = crypto.scryptSync(encryptionKey, 'brain-wallet-salt', 32);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKey)),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: IV (16 bytes) + AuthTag (16 bytes) + Encrypted data
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a keypair's secret key from storage
 */
function decryptKeypair(encryptedData: Buffer, encryptionKey: string): Uint8Array {
  const key = crypto.scryptSync(encryptionKey, 'brain-wallet-salt', 32);

  const iv = encryptedData.subarray(0, IV_LENGTH);
  const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return new Uint8Array(decrypted);
}

/**
 * Initialize the brain wallet table
 */
export function initWalletTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brain_wallet (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      public_key TEXT NOT NULL,
      encrypted_keypair BLOB NOT NULL,
      sol_balance INTEGER DEFAULT 0,
      cc_balance INTEGER DEFAULT 0,
      total_distributed INTEGER DEFAULT 0,
      last_sync TEXT
    )
  `);
}

/**
 * Check if the brain wallet exists
 */
export function walletExists(): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM brain_wallet WHERE id = 1');
  const result = stmt.get() as { count: number };
  return result.count > 0;
}

/**
 * Create a new brain wallet (one-time setup)
 */
export function createWallet(encryptionKey: string): { publicKey: string; mnemonic?: string } {
  if (walletExists()) {
    throw new Error('Brain wallet already exists. Use importWallet to replace it.');
  }

  // Generate a new keypair
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const encryptedKeypair = encryptKeypair(keypair.secretKey, encryptionKey);

  // Store in database
  const stmt = db.prepare(`
    INSERT INTO brain_wallet (id, public_key, encrypted_keypair)
    VALUES (1, ?, ?)
  `);
  stmt.run(publicKey, encryptedKeypair);

  console.log(`✓ Brain wallet created: ${publicKey}`);

  return { publicKey };
}

/**
 * Import an existing wallet from a secret key (base58 or byte array)
 */
export function importWallet(secretKeyBase58: string, encryptionKey: string): { publicKey: string } {
  // Decode base58 secret key
  const bs58 = require('bs58');
  const secretKeyBytes = bs58.decode(secretKeyBase58);
  const keypair = Keypair.fromSecretKey(secretKeyBytes);
  const publicKey = keypair.publicKey.toBase58();
  const encryptedKeypair = encryptKeypair(keypair.secretKey, encryptionKey);

  // Upsert in database
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO brain_wallet (id, public_key, encrypted_keypair, sol_balance, cc_balance, total_distributed)
    VALUES (1, ?, ?, 0, 0, 0)
  `);
  stmt.run(publicKey, encryptedKeypair);

  console.log(`✓ Brain wallet imported: ${publicKey}`);

  return { publicKey };
}

/**
 * Get the brain wallet state from database
 */
export function getWalletState(): WalletState | null {
  const stmt = db.prepare('SELECT * FROM brain_wallet WHERE id = 1');
  const row = stmt.get() as {
    public_key: string;
    sol_balance: number;
    cc_balance: number;
    total_distributed: number;
    last_sync: string | null;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    publicKey: row.public_key,
    solBalance: row.sol_balance,
    ccBalance: row.cc_balance,
    totalDistributed: row.total_distributed,
    lastSync: row.last_sync,
  };
}

/**
 * Load keypair from JSON file (Solana CLI format)
 */
function loadKeypairFromFile(filePath: string): Keypair {
  const keyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(keyData));
}

/**
 * Load the full brain wallet with signing capabilities
 * Supports both encrypted DB storage and direct keypair file (for Docker containers)
 */
export function loadWallet(encryptionKey: string): BrainWallet {
  let keypair: Keypair;

  // First, try to load from DB (encrypted storage)
  const stmt = db.prepare('SELECT * FROM brain_wallet WHERE id = 1');
  const row = stmt.get() as {
    public_key: string;
    encrypted_keypair: Buffer;
  } | undefined;

  if (row) {
    // Decrypt the keypair from DB
    const secretKey = decryptKeypair(row.encrypted_keypair, encryptionKey);
    keypair = Keypair.fromSecretKey(secretKey);

    // Verify the public key matches
    if (keypair.publicKey.toBase58() !== row.public_key) {
      throw new Error('Wallet decryption failed: public key mismatch');
    }
  } else {
    // Fallback: try to load from keypair file (for Docker)
    const keypairPath = process.env.SOLANA_KEYPAIR_PATH || '/data/wallet/keypair.json';

    if (!fs.existsSync(keypairPath)) {
      throw new Error(`Brain wallet not found in DB and no keypair file at ${keypairPath}`);
    }

    console.log(`[Wallet] Loading keypair from file: ${keypairPath}`);
    keypair = loadKeypairFromFile(keypairPath);

    // Auto-import into DB for future use
    console.log(`[Wallet] Auto-importing keypair into encrypted DB storage...`);
    const encryptedKeypair = encryptKeypair(keypair.secretKey, encryptionKey);
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO brain_wallet (id, public_key, encrypted_keypair, sol_balance, cc_balance, total_distributed)
      VALUES (1, ?, ?, 0, 0, 0)
    `);
    insertStmt.run(keypair.publicKey.toBase58(), encryptedKeypair);
    console.log(`[Wallet] Keypair imported: ${keypair.publicKey.toBase58()}`);
  }

  return {
    publicKey: keypair.publicKey,
    keypair,

    async getBalance(connection: Connection): Promise<WalletBalance> {
      // Get SOL balance
      const solLamports = await connection.getBalance(keypair.publicKey);

      // Get $CC token balance
      let ccLamports = BigInt(0);
      try {
        const ata = await getAssociatedTokenAddress(CC_TOKEN_MINT, keypair.publicKey);
        const tokenAccount = await getAccount(connection, ata);
        ccLamports = tokenAccount.amount;
      } catch (error) {
        if (!(error instanceof TokenAccountNotFoundError)) {
          throw error;
        }
        // Token account doesn't exist yet = 0 balance
      }

      return {
        sol: solLamports / LAMPORTS_PER_SOL,
        cc: Number(ccLamports) / 1_000_000_000, // 9 decimals for $CC
        solLamports: BigInt(solLamports),
        ccLamports,
      };
    },

    signTransaction(tx: Transaction): Transaction {
      tx.sign(keypair);
      return tx;
    },

    async signAndSendTransaction(connection: Connection, tx: Transaction): Promise<string> {
      const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
        commitment: 'confirmed',
      });
      return signature;
    },
  };
}

/**
 * Update cached balance in database (call after sync)
 */
export function updateCachedBalance(solBalance: number, ccBalance: number): void {
  const stmt = db.prepare(`
    UPDATE brain_wallet
    SET sol_balance = ?, cc_balance = ?, last_sync = datetime('now')
    WHERE id = 1
  `);
  stmt.run(Math.floor(solBalance * LAMPORTS_PER_SOL), Math.floor(ccBalance * 1_000_000_000));
}

/**
 * Record a distribution from the brain wallet
 */
export function recordDistribution(amount: number): void {
  const stmt = db.prepare(`
    UPDATE brain_wallet
    SET total_distributed = total_distributed + ?
    WHERE id = 1
  `);
  stmt.run(Math.floor(amount * 1_000_000_000)); // 9 decimals
}

/**
 * Get distribution stats
 */
export function getDistributionStats(): {
  totalDistributed: number;
  dailyDistributed: number;
  canDistribute: boolean;
  dailyLimit: number;
} {
  const state = getWalletState();
  if (!state) {
    return {
      totalDistributed: 0,
      dailyDistributed: 0,
      canDistribute: false,
      dailyLimit: 0,
    };
  }

  // Calculate daily distribution from game_bets table
  const dailyStmt = db.prepare(`
    SELECT COALESCE(SUM(payout_amount), 0) as total
    FROM game_bets
    WHERE date(created_at) = date('now')
  `);
  const dailyResult = dailyStmt.get() as { total: number } | undefined;
  const dailyDistributed = (dailyResult?.total || 0) / 1_000_000_000; // 9 decimals

  // Daily limit: 1% of bankroll (configurable)
  const dailyLimit = state.ccBalance * 0.01;

  return {
    totalDistributed: state.totalDistributed / 1_000_000_000, // 9 decimals
    dailyDistributed,
    canDistribute: dailyDistributed < dailyLimit,
    dailyLimit,
  };
}

/**
 * Security: Check for unusual activity patterns
 */
export function checkSecurityAlerts(): string[] {
  const alerts: string[] = [];

  // Check for high daily volume
  const stats = getDistributionStats();
  if (stats.dailyDistributed > stats.dailyLimit * 0.8) {
    alerts.push(`High daily distribution: ${stats.dailyDistributed.toFixed(0)} / ${stats.dailyLimit.toFixed(0)} $CC (${((stats.dailyDistributed / stats.dailyLimit) * 100).toFixed(1)}%)`);
  }

  // Check for large single payouts in last hour
  const largePayoutsStmt = db.prepare(`
    SELECT COUNT(*) as count, MAX(payout_amount) as max_payout
    FROM game_bets
    WHERE datetime(created_at) > datetime('now', '-1 hour')
    AND payout_amount > 10000000000  -- > 10K $CC
  `);
  const largePayouts = largePayoutsStmt.get() as { count: number; max_payout: number } | undefined;
  if (largePayouts && largePayouts.count > 0) {
    alerts.push(`${largePayouts.count} large payouts in last hour (max: ${(largePayouts.max_payout / 1_000_000_000).toFixed(0)} $CC)`);
  }

  // Check for same wallet hitting frequently
  const frequentWalletStmt = db.prepare(`
    SELECT wallet, COUNT(*) as bet_count
    FROM game_bets
    WHERE datetime(created_at) > datetime('now', '-1 hour')
    GROUP BY wallet
    HAVING bet_count > 50
  `);
  const frequentWallets = frequentWalletStmt.all() as { wallet: string; bet_count: number }[];
  for (const fw of frequentWallets) {
    alerts.push(`High frequency wallet: ${fw.wallet.slice(0, 8)}... (${fw.bet_count} bets/hour)`);
  }

  return alerts;
}

// ============ BURN WALLET (SAFETY AIRLOCK) ============
/**
 * The burn wallet is a dedicated wallet used ONLY for burn operations.
 * This creates an "airlock" pattern:
 *
 *   Brain Wallet (1.68M $CC)
 *         │
 *   Transfer exact amount
 *         │
 *         ▼
 *   Burn Wallet (airlock)
 *         │
 *   Burn ENTIRE balance
 *         │
 *         ▼
 *      🔥 BURNED
 *
 * Why this is safer:
 * - Even if code has a bug that burns "entire balance", it only burns what's in burn wallet
 * - The brain wallet (with rewards pool) is NEVER at risk
 * - Clear audit trail: transfer tx + burn tx
 * - Simple to verify: burn wallet should always be empty after operations
 */

export interface BurnWallet {
  publicKey: PublicKey;
  keypair: Keypair;
  getBalance: (connection: Connection) => Promise<WalletBalance>;
  signTransaction: (tx: Transaction) => Transaction;
  signAndSendTransaction: (connection: Connection, tx: Transaction) => Promise<string>;
}

export interface BurnWalletState {
  publicKey: string;
  isEmpty: boolean;
  ccBalance: number;
  solBalance: number;
  lastSync: string | null;
}

/**
 * Initialize the burn wallet table
 */
export function initBurnWalletTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS burn_wallet (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      public_key TEXT NOT NULL,
      encrypted_keypair BLOB NOT NULL,
      sol_balance INTEGER DEFAULT 0,
      cc_balance INTEGER DEFAULT 0,
      last_sync TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Check if the burn wallet exists
 */
export function burnWalletExists(): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM burn_wallet WHERE id = 1');
  const result = stmt.get() as { count: number };
  return result.count > 0;
}

/**
 * Create a new burn wallet (one-time setup)
 * This wallet is used ONLY for burn operations
 */
export function createBurnWallet(encryptionKey: string): { publicKey: string } {
  if (burnWalletExists()) {
    throw new Error('Burn wallet already exists.');
  }

  // Generate a new keypair
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const encryptedKeypair = encryptKeypair(keypair.secretKey, encryptionKey);

  // Store in database
  const stmt = db.prepare(`
    INSERT INTO burn_wallet (id, public_key, encrypted_keypair)
    VALUES (1, ?, ?)
  `);
  stmt.run(publicKey, encryptedKeypair);

  console.log(`✓ Burn wallet created: ${publicKey}`);
  console.log(`  This wallet is used ONLY for burn operations (safety airlock)`);

  return { publicKey };
}

/**
 * Get the burn wallet state from database
 */
export function getBurnWalletState(): BurnWalletState | null {
  const stmt = db.prepare('SELECT * FROM burn_wallet WHERE id = 1');
  const row = stmt.get() as {
    public_key: string;
    sol_balance: number;
    cc_balance: number;
    last_sync: string | null;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    publicKey: row.public_key,
    isEmpty: row.cc_balance === 0,
    ccBalance: row.cc_balance / 1_000_000_000, // 9 decimals
    solBalance: row.sol_balance / LAMPORTS_PER_SOL,
    lastSync: row.last_sync,
  };
}

/**
 * Load the burn wallet with signing capabilities
 */
export function loadBurnWallet(encryptionKey: string): BurnWallet {
  const stmt = db.prepare('SELECT * FROM burn_wallet WHERE id = 1');
  const row = stmt.get() as {
    public_key: string;
    encrypted_keypair: Buffer;
  } | undefined;

  if (!row) {
    throw new Error('Burn wallet not found. Create it first with createBurnWallet()');
  }

  // Decrypt the keypair
  const secretKey = decryptKeypair(row.encrypted_keypair, encryptionKey);
  const keypair = Keypair.fromSecretKey(secretKey);

  // Verify the public key matches
  if (keypair.publicKey.toBase58() !== row.public_key) {
    throw new Error('Burn wallet decryption failed: public key mismatch');
  }

  return {
    publicKey: keypair.publicKey,
    keypair,

    async getBalance(connection: Connection): Promise<WalletBalance> {
      // Get SOL balance
      const solLamports = await connection.getBalance(keypair.publicKey);

      // Get $CC token balance
      let ccLamports = BigInt(0);
      try {
        const ata = await getAssociatedTokenAddress(CC_TOKEN_MINT, keypair.publicKey);
        const tokenAccount = await getAccount(connection, ata);
        ccLamports = tokenAccount.amount;
      } catch (error) {
        if (!(error instanceof TokenAccountNotFoundError)) {
          throw error;
        }
        // Token account doesn't exist yet = 0 balance
      }

      return {
        sol: solLamports / LAMPORTS_PER_SOL,
        cc: Number(ccLamports) / 1_000_000_000, // 9 decimals for $CC
        solLamports: BigInt(solLamports),
        ccLamports,
      };
    },

    signTransaction(tx: Transaction): Transaction {
      tx.sign(keypair);
      return tx;
    },

    async signAndSendTransaction(connection: Connection, tx: Transaction): Promise<string> {
      const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
        commitment: 'confirmed',
      });
      return signature;
    },
  };
}

/**
 * Update cached burn wallet balance in database
 */
export function updateBurnWalletCachedBalance(solBalance: number, ccBalance: number): void {
  const stmt = db.prepare(`
    UPDATE burn_wallet
    SET sol_balance = ?, cc_balance = ?, last_sync = datetime('now')
    WHERE id = 1
  `);
  stmt.run(Math.floor(solBalance * LAMPORTS_PER_SOL), Math.floor(ccBalance * 1_000_000_000));
}

// ============ REWARDS WALLET (COLD STORAGE) ============
/**
 * The rewards wallet is a dedicated "cold storage" wallet that holds the majority
 * of the casino bankroll (9M $CC). It is NEVER used directly by games.
 *
 * 3-Wallet Architecture:
 *
 *   ┌─────────────────────────┐
 *   │     REWARDS WALLET      │  ← Cold Storage (9M $CC)
 *   │     (Ultra Secure)      │
 *   │  • Never used by games  │
 *   │  • Only tops up game    │
 *   │  • Max 1M/day transfer  │
 *   └───────────┬─────────────┘
 *               │
 *      Daily top-up (if < 300K)
 *               │
 *               ▼
 *   ┌─────────────────────────┐
 *   │      GAME WALLET        │  ← Hot Wallet (1M $CC)
 *   │    (Current Brain)      │
 *   │  • Game payouts only    │
 *   │  • Max 100K per payout  │
 *   │  • Max 500K/day payouts │
 *   └───────────┬─────────────┘
 *               │
 *          Game payouts
 *               │
 *               ▼
 *           Players
 *
 *   ┌─────────────────────────┐
 *   │      BURN WALLET        │  ← Already implemented ✅
 *   │      (Airlock)          │
 *   │  • Burns only           │
 *   └─────────────────────────┘
 *
 * Why this is safer:
 * - Even if a game has a critical bug, max loss is 1M $CC (game wallet)
 * - Rewards wallet is never touched by game code
 * - Daily limits + circuit breakers prevent rapid drainage
 * - Clear separation of concerns
 */

export interface RewardsWallet {
  publicKey: PublicKey;
  keypair: Keypair;
  getBalance: (connection: Connection) => Promise<WalletBalance>;
  signTransaction: (tx: Transaction) => Transaction;
  signAndSendTransaction: (connection: Connection, tx: Transaction) => Promise<string>;
}

export interface RewardsWalletState {
  publicKey: string;
  ccBalance: number;
  solBalance: number;
  totalDistributed: number;
  lastSync: string | null;
  createdAt: string | null;
}

/**
 * Initialize the rewards wallet table
 */
export function initRewardsWalletTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rewards_wallet (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      public_key TEXT NOT NULL,
      encrypted_keypair BLOB NOT NULL,
      cc_balance INTEGER DEFAULT 0,
      sol_balance INTEGER DEFAULT 0,
      total_distributed INTEGER DEFAULT 0,
      last_sync TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Check if the rewards wallet exists
 */
export function rewardsWalletExists(): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM rewards_wallet WHERE id = 1');
  const result = stmt.get() as { count: number };
  return result.count > 0;
}

/**
 * Create a new rewards wallet (one-time setup)
 * This wallet holds the majority of the bankroll (cold storage)
 */
export function createRewardsWallet(encryptionKey: string): { publicKey: string } {
  if (rewardsWalletExists()) {
    throw new Error('Rewards wallet already exists.');
  }

  // Generate a new keypair
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const encryptedKeypair = encryptKeypair(keypair.secretKey, encryptionKey);

  // Store in database
  const stmt = db.prepare(`
    INSERT INTO rewards_wallet (id, public_key, encrypted_keypair)
    VALUES (1, ?, ?)
  `);
  stmt.run(publicKey, encryptedKeypair);

  console.log(`✓ Rewards wallet created: ${publicKey}`);
  console.log(`  This wallet is for cold storage - NEVER used by games directly`);

  return { publicKey };
}

/**
 * Import an existing rewards wallet from a secret key
 */
export function importRewardsWallet(secretKeyBase58: string, encryptionKey: string): { publicKey: string } {
  const bs58 = require('bs58');
  const secretKeyBytes = bs58.decode(secretKeyBase58);
  const keypair = Keypair.fromSecretKey(secretKeyBytes);
  const publicKey = keypair.publicKey.toBase58();
  const encryptedKeypair = encryptKeypair(keypair.secretKey, encryptionKey);

  // Upsert in database
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO rewards_wallet (id, public_key, encrypted_keypair, cc_balance, sol_balance, total_distributed)
    VALUES (1, ?, ?, 0, 0, 0)
  `);
  stmt.run(publicKey, encryptedKeypair);

  console.log(`✓ Rewards wallet imported: ${publicKey}`);

  return { publicKey };
}

/**
 * Get the rewards wallet state from database
 */
export function getRewardsWalletState(): RewardsWalletState | null {
  const stmt = db.prepare('SELECT * FROM rewards_wallet WHERE id = 1');
  const row = stmt.get() as {
    public_key: string;
    cc_balance: number;
    sol_balance: number;
    total_distributed: number;
    last_sync: string | null;
    created_at: string | null;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    publicKey: row.public_key,
    ccBalance: row.cc_balance / 1_000_000_000, // 9 decimals
    solBalance: row.sol_balance / LAMPORTS_PER_SOL,
    totalDistributed: row.total_distributed / 1_000_000_000, // 9 decimals
    lastSync: row.last_sync,
    createdAt: row.created_at,
  };
}

/**
 * Load the rewards wallet with signing capabilities
 */
export function loadRewardsWallet(encryptionKey: string): RewardsWallet {
  const stmt = db.prepare('SELECT * FROM rewards_wallet WHERE id = 1');
  const row = stmt.get() as {
    public_key: string;
    encrypted_keypair: Buffer;
  } | undefined;

  if (!row) {
    throw new Error('Rewards wallet not found. Create it first with createRewardsWallet()');
  }

  // Decrypt the keypair
  const secretKey = decryptKeypair(row.encrypted_keypair, encryptionKey);
  const keypair = Keypair.fromSecretKey(secretKey);

  // Verify the public key matches
  if (keypair.publicKey.toBase58() !== row.public_key) {
    throw new Error('Rewards wallet decryption failed: public key mismatch');
  }

  return {
    publicKey: keypair.publicKey,
    keypair,

    async getBalance(connection: Connection): Promise<WalletBalance> {
      // Get SOL balance
      const solLamports = await connection.getBalance(keypair.publicKey);

      // Get $CC token balance
      let ccLamports = BigInt(0);
      try {
        const ata = await getAssociatedTokenAddress(CC_TOKEN_MINT, keypair.publicKey);
        const tokenAccount = await getAccount(connection, ata);
        ccLamports = tokenAccount.amount;
      } catch (error) {
        if (!(error instanceof TokenAccountNotFoundError)) {
          throw error;
        }
        // Token account doesn't exist yet = 0 balance
      }

      return {
        sol: solLamports / LAMPORTS_PER_SOL,
        cc: Number(ccLamports) / 1_000_000_000, // 9 decimals for $CC
        solLamports: BigInt(solLamports),
        ccLamports,
      };
    },

    signTransaction(tx: Transaction): Transaction {
      tx.sign(keypair);
      return tx;
    },

    async signAndSendTransaction(connection: Connection, tx: Transaction): Promise<string> {
      const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
        commitment: 'confirmed',
      });
      return signature;
    },
  };
}

/**
 * Update cached rewards wallet balance in database
 */
export function updateRewardsWalletCachedBalance(solBalance: number, ccBalance: number): void {
  const stmt = db.prepare(`
    UPDATE rewards_wallet
    SET sol_balance = ?, cc_balance = ?, last_sync = datetime('now')
    WHERE id = 1
  `);
  stmt.run(Math.floor(solBalance * LAMPORTS_PER_SOL), Math.floor(ccBalance * 1_000_000_000));
}

/**
 * Record a distribution from rewards wallet to game wallet
 */
export function recordRewardsDistribution(amount: number): void {
  const stmt = db.prepare(`
    UPDATE rewards_wallet
    SET total_distributed = total_distributed + ?
    WHERE id = 1
  `);
  stmt.run(Math.floor(amount * 1_000_000_000)); // 9 decimals
}

// Initialize wallet tables on module load
initWalletTable();
initBurnWalletTable();
initRewardsWalletTable();
