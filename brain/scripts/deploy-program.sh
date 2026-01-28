#!/bin/bash
# Deploy Casino Program to Solana Devnet
#
# Prerequisites:
# - Solana CLI installed and configured for devnet
# - Anchor CLI installed
# - Devnet SOL in deployer wallet (~5 SOL)
#
# Usage:
#   chmod +x brain/scripts/deploy-program.sh
#   ./brain/scripts/deploy-program.sh

set -e

echo "=== Casino Program Deployment ==="
echo ""

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo "✗ Solana CLI not found"
    echo "Install: sh -c \"\$(curl -sSfL https://release.anza.xyz/stable/install)\""
    exit 1
fi

# Check Anchor CLI
if ! command -v anchor &> /dev/null; then
    echo "✗ Anchor CLI not found"
    echo "Install: cargo install --git https://github.com/coral-xyz/anchor avm && avm install latest && avm use latest"
    exit 1
fi

# Check network
NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')
echo "Network: $NETWORK"

if [[ "$NETWORK" != *"devnet"* ]]; then
    echo "⚠ Not on devnet! Switching..."
    solana config set --url devnet
fi

# Check balance
BALANCE=$(solana balance)
echo "Deployer balance: $BALANCE"

if [[ "$BALANCE" == "0 SOL" ]]; then
    echo "Airdropping 5 SOL..."
    solana airdrop 5
fi

# Navigate to program directory
cd "$(dirname "$0")/../../programs/cc-casino"
echo ""
echo "Building program..."

# Build
anchor build

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/cc_casino-keypair.json)
echo ""
echo "Program ID: $PROGRAM_ID"

# Update lib.rs with new program ID
echo "Updating declare_id! in lib.rs..."
sed -i '' "s/declare_id!(\"[^\"]*\")/declare_id!(\"$PROGRAM_ID\")/" src/lib.rs

# Update Anchor.toml
echo "Updating Anchor.toml..."
sed -i '' "s/cc_casino = \"[^\"]*\"/cc_casino = \"$PROGRAM_ID\"/" Anchor.toml

# Rebuild with correct ID
echo ""
echo "Rebuilding with correct program ID..."
anchor build

# Deploy
echo ""
echo "Deploying to devnet..."
anchor deploy --provider.cluster devnet

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Program ID: $PROGRAM_ID"
echo ""
echo "Add to .env.devnet:"
echo "CASINO_PROGRAM_ID=$PROGRAM_ID"
echo ""
echo "Add to brain/src/solana.ts if needed"
