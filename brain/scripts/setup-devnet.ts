#!/usr/bin/env npx ts-node
/**
 * Devnet Setup Script
 *
 * This script sets up the brain wallet on Solana devnet:
 * 1. Creates a new brain wallet (or imports existing)
 * 2. Airdrops devnet SOL
 * 3. Transfers devnet $CC tokens from deployer
 *
 * Prerequisites:
 * - Devnet $CC token created (DEVNET_CC_MINT in .env.devnet)
 * - Deployer has 100M devnet $CC tokens
 *
 * Usage:
 *   SOLANA_NETWORK=devnet npx ts-node brain/scripts/setup-devnet.ts
 */

import { Connection, LAMPORTS_PER_SOL, Keypair, PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Force devnet
process.env.SOLANA_NETWORK = 'devnet';

// Import after setting env
import { createWallet, loadWallet, walletExists, CC_TOKEN_MINT } from '../src/wallet.js';
import { getConnection, NETWORK } from '../src/solana.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const AIRDROP_AMOUNT = 2; // SOL
const CC_TRANSFER_AMOUNT = 10_000_000; // 10M $CC for brain operations

async function main() {
  console.log('=== Brain Devnet Setup ===\n');
  console.log(`Network: ${NETWORK}`);
  console.log(`$CC Mint: ${CC_TOKEN_MINT.toBase58()}`);

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  // 1. Create or verify brain wallet
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'devnet-test-key';
  let brainPubkey: PublicKey;

  if (walletExists()) {
    console.log('\n✓ Brain wallet already exists');
    const wallet = loadWallet(encryptionKey);
    brainPubkey = wallet.publicKey;
  } else {
    console.log('\n→ Creating new brain wallet...');
    const result = createWallet(encryptionKey);
    brainPubkey = new PublicKey(result.publicKey);
  }

  console.log(`  Brain wallet: ${brainPubkey.toBase58()}`);

  // 2. Check SOL balance, airdrop if needed
  const solBalance = await connection.getBalance(brainPubkey);
  console.log(`\n→ SOL balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

  if (solBalance < 0.5 * LAMPORTS_PER_SOL) {
    console.log(`  Airdropping ${AIRDROP_AMOUNT} SOL...`);
    try {
      const sig = await connection.requestAirdrop(brainPubkey, AIRDROP_AMOUNT * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      console.log(`  ✓ Airdrop complete: ${sig}`);
    } catch (error) {
      console.log(`  ⚠ Airdrop failed (may have rate limit): ${(error as Error).message}`);
    }
  }

  // 3. Check $CC balance, transfer from deployer if needed
  const brainAta = await getAssociatedTokenAddress(CC_TOKEN_MINT, brainPubkey);
  let ccBalance = BigInt(0);

  try {
    const tokenAccount = await getAccount(connection, brainAta);
    ccBalance = tokenAccount.amount;
  } catch {
    // Token account doesn't exist yet
  }

  console.log(`\n→ $CC balance: ${Number(ccBalance) / 1_000_000} $CC`);

  if (Number(ccBalance) < 1_000_000 * 1_000_000) {
    // Less than 1M $CC
    console.log(`  Transferring ${CC_TRANSFER_AMOUNT / 1_000_000}M $CC from deployer...`);

    // Load deployer keypair
    const deployerKeyPath =
      process.env.DEPLOYER_KEYPAIR_PATH || '/Users/claude/.config/solana/devnet-deployer.json';

    if (!fs.existsSync(deployerKeyPath)) {
      console.error(`  ✗ Deployer keypair not found at ${deployerKeyPath}`);
      console.log('  Run: solana-keygen new -o ~/.config/solana/devnet-deployer.json');
      process.exit(1);
    }

    const deployerSecretKey = JSON.parse(fs.readFileSync(deployerKeyPath, 'utf-8'));
    const deployer = Keypair.fromSecretKey(new Uint8Array(deployerSecretKey));

    console.log(`  Deployer: ${deployer.publicKey.toBase58()}`);

    const deployerAta = await getAssociatedTokenAddress(CC_TOKEN_MINT, deployer.publicKey);

    // Check deployer balance
    try {
      const deployerTokenAccount = await getAccount(connection, deployerAta);
      console.log(
        `  Deployer $CC balance: ${Number(deployerTokenAccount.amount) / 1_000_000} $CC`
      );

      if (deployerTokenAccount.amount < BigInt(CC_TRANSFER_AMOUNT * 1_000_000)) {
        console.error('  ✗ Deployer has insufficient $CC balance');
        process.exit(1);
      }
    } catch {
      console.error('  ✗ Deployer token account not found');
      process.exit(1);
    }

    // Build and send transfer transaction
    const { Transaction, sendAndConfirmTransaction } = await import('@solana/web3.js');
    const tx = new Transaction();

    // Create brain's ATA if it doesn't exist
    const brainAtaInfo = await connection.getAccountInfo(brainAta);
    if (!brainAtaInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(deployer.publicKey, brainAta, brainPubkey, CC_TOKEN_MINT)
      );
    }

    // Transfer $CC
    tx.add(
      createTransferInstruction(
        deployerAta,
        brainAta,
        deployer.publicKey,
        BigInt(CC_TRANSFER_AMOUNT * 1_000_000)
      )
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [deployer]);
    console.log(`  ✓ Transfer complete: ${sig}`);
  }

  // 4. Final status
  console.log('\n=== Setup Complete ===\n');

  const finalSolBalance = await connection.getBalance(brainPubkey);
  let finalCcBalance = BigInt(0);
  try {
    const tokenAccount = await getAccount(connection, brainAta);
    finalCcBalance = tokenAccount.amount;
  } catch {
    // Still no token account
  }

  console.log(`Brain Wallet: ${brainPubkey.toBase58()}`);
  console.log(`SOL Balance:  ${finalSolBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`$CC Balance:  ${Number(finalCcBalance) / 1_000_000} $CC`);
  console.log(`\nNetwork:      ${NETWORK}`);
  console.log(`$CC Mint:     ${CC_TOKEN_MINT.toBase58()}`);
  console.log('\nReady for devnet testing!');
}

main().catch(console.error);
