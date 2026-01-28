#!/bin/bash
set -e

echo "=== Brain Agent Container Starting ==="
echo "Container ID: $(hostname)"
echo "Network: ${SOLANA_NETWORK:-devnet}"

# Initialize Solana config
solana config set --url ${SOLANA_RPC_URL:-https://api.devnet.solana.com}

# Check if wallet exists, create if not
if [ ! -f "$BRAIN_WALLET_PATH" ]; then
    echo "Creating new brain wallet..."
    mkdir -p $(dirname $BRAIN_WALLET_PATH)
    solana-keygen new --outfile $BRAIN_WALLET_PATH --no-bip39-passphrase --force

    PUBKEY=$(solana-keygen pubkey $BRAIN_WALLET_PATH)
    echo "New wallet created: $PUBKEY"

    # If on devnet, try to airdrop
    if [ "$SOLANA_NETWORK" = "devnet" ]; then
        echo "Requesting devnet airdrop..."
        solana airdrop 2 $PUBKEY --url devnet || echo "Airdrop failed (rate limited?)"
    fi
else
    PUBKEY=$(solana-keygen pubkey $BRAIN_WALLET_PATH)
    echo "Using existing wallet: $PUBKEY"
fi

# Set the wallet for Solana CLI
solana config set --keypair $BRAIN_WALLET_PATH

# Show balance
echo "Wallet balance:"
solana balance || echo "Could not fetch balance"

# Initialize database directory
mkdir -p $(dirname $BRAIN_DB_PATH)
mkdir -p $RECORDINGS_PATH

echo "=== Starting Brain Service ==="
exec "$@"
