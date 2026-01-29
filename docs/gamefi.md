# GameFi - CC Flip & Wallet Integration

> Mainnet coin flip game with Solana wallet integration

---

## CC Flip (`/ccflip`)

### Overview

- **Network:** Solana Mainnet (real $CC tokens)
- **$CC Token:** `Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS`
- **House Edge:** 2% (1.96x payout)
- **Bet Limits:** 1 - 1,000,000 $CC

### Features

- Solana wallet connection (Phantom, Solflare)
- Coin flip animation with heads/tails selection
- 1.96x payout multiplier (2% house edge)
- Bet history display
- Provably fair with SHA256 commit-reveal
- **Platform fee:** ~$0.05 SOL per spin (funds buyback & burn)
- **Buyback & Burn:** Every 6 hours, all SOL fees → buy $CC → burn 100%

### Tokenomics

| Component | Destination | Purpose |
|-----------|-------------|---------|
| House edge (2%) | Stays in game | Fuels future rewards (never sold) |
| Platform fee (~$0.05 SOL) | Buys $CC from market | Burns 100% via Metaplex |
| DEX | FrogX | Swap routing |

---

## Game Flow

1. Connect wallet (mainnet)
2. Choose heads or tails
3. Set bet amount
4. Approve transaction ($CC deposit + ~$0.05 SOL fee)
5. Win 1.96x or lose bet

### Testing Mode

Add `?devnet=1` query param to use devnet for testing.

---

## Provably Fair - Two-Party Entropy

Neither party can cheat - server can't predict txSignature, user can't predict serverSecret.

### How It Works

1. Server generates `serverSecret = crypto.randomBytes(32)`
2. Server sends `commitment = SHA256(serverSecret)` BEFORE user signs
3. User deposits tokens (creates unpredictable `txSignature`)
4. Server reveals `serverSecret` - result computed from BOTH:
   ```
   Result = SHA256(serverSecret + txSignature)[0] < 128 ? heads : tails
   ```
5. User verifies: `SHA256(serverSecret) === commitment` AND recomputes result

---

## GameFi Components

Located in `app/components/gamefi/`:

| Component | Purpose |
|-----------|---------|
| `index.ts` | Re-exports all components |
| `WalletProvider.tsx` | Solana wallet adapter setup |
| `ConnectWallet.tsx` | Connect button + balance display |
| `BetInput.tsx` | $CC amount input with max button |
| `FeeDisplay.tsx` | Shows SOL platform fee |
| `GameResult.tsx` | Win/lose modal with confetti |
| `ProvablyFair.tsx` | Two-party entropy verification UI |

### Hooks

| Hook | Purpose |
|------|---------|
| `useBalance.ts` | $CC + SOL balance hook |
| `useProgram.ts` | Anchor program connection |
| `useGameState.ts` | Game PDA state hook |

---

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `app/ccflip/page.tsx` | Mainnet coin flip game | ~280 |
| `app/_template/coinflip/page.tsx` | Coin flip reference impl | ~284 |
| `app/components/gamefi/*.tsx` | Shared GameFi components | various |

---

## Devnet Testing

- **Token:** $CC (Devnet)
- **Contract:** `GzoMpC5ywKJzHsKmHBepHUXBP72V9QMtVBqus3egCDe9`
- **Supply:** 1,000,000,000
- **Mint Authority:** Brain wallet (`HFss9LWnsmmLqxWHRfQJ7BHKBX8tSzuhw1Qny3QQAb4z`)
- **Notes:** For testing ccflip and other games. GameFi components auto-detect network.
