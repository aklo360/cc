# CC Trading Terminal

> Dedicated SOL/$CC trading interface with Jupiter integration and anti-sell friction

---

## Overview

The Trading Terminal (`/swap`) is a focused swap interface for trading between SOL and $CC. Unlike general DEX aggregators, it's designed specifically for $CC with memecoin-appropriate defaults and fun UX elements.

**Live URL:** https://claudecode.wtf/swap

---

## Features

### Core Trading
- **SOL ↔ $CC swaps** via Jupiter aggregator
- **Real-time quotes** with auto-refresh
- **GMGN price chart** embedded iframe
- **Memecoin slippage defaults** (5% default, options up to 10%)

### Fee System
- **1% platform fee** on all swaps
- **Buy fees** (CC) → Brain bankroll (house profit)
- **Sell fees** (SOL) → Buyback & burn pipeline

### Anti-Sell Friction (For Fun)
- **DVD Bouncing Button**: Sell button bounces around screen like DVD logo
- Users must chase and click the moving button to sell
- Creates memorable UX and slight friction on sells

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     /swap Page                               │
│   ┌─────────────────┐  ┌─────────────────────────────────┐  │
│   │  GMGN Chart     │  │  Trading Panel                  │  │
│   │  (iframe)       │  │  - Buy/Sell tabs                │  │
│   │                 │  │  - Amount input                 │  │
│   │                 │  │  - Quote display                │  │
│   │                 │  │  - Slippage settings            │  │
│   └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Jupiter API                                │
│   - Quote API: GET /quote                                   │
│   - Swap API: POST /swap                                    │
│   - Uses priority fees for reliable execution               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Solana Blockchain                         │
│   - Transaction execution                                   │
│   - Fee collection to Brain wallets                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Fee Collection Flow

```
Swap Terminal Fee Collection
├── BUY (SOL → CC): 1% CC fee → Brain CC ATA (mixed with bankroll)
│   └── Result: House keeps as profit (adds to bankroll)
│
└── SELL (CC → SOL): 1% SOL fee → Brain wSOL ATA (separate)
    └── When >= 0.1 SOL (every 6 hours):
        Jupiter swap → CC → Burn wallet → Burn
        (deflationary pressure on token supply)
```

**Fee Processing (brain/src/buyback.ts):**
- `getSwapFeeBalances()` - Check accumulated fee balances
- `processAllSwapFees(dryRun?)` - Trigger buyback & burn

**API Endpoints:**
- `GET /fees/balances` - Check fee balances
- `POST /fees/process` - Manually trigger fee processing

---

## Files

| File | Purpose |
|------|---------|
| `app/swap/page.tsx` | Main trading terminal UI |
| `app/swap/lib/jupiter.ts` | Jupiter API integration |
| `app/swap/lib/tokens.ts` | Token metadata |
| `app/swap/lib/frogx.ts` | Legacy FrogX integration (unused) |
| `brain/src/buyback.ts` | Fee processing & burn pipeline |

---

## Configuration

### Slippage Options
```typescript
const SLIPPAGE_OPTIONS = [
  { label: '3%', value: 300 },   // Conservative
  { label: '5%', value: 500 },   // Default (good for memecoins)
  { label: '7%', value: 700 },   // High volatility
  { label: '10%', value: 1000 }, // Maximum
];
```

### Price Impact Warnings
```typescript
const PRICE_IMPACT_WARNING = 5;  // Yellow warning at 5%
const PRICE_IMPACT_DANGER = 10;  // Red warning at 10%
```

---

## DVD Bounce Animation

When user switches to Sell mode, the swap button detaches and bounces around the screen:

```typescript
// DVD bounce state
const [buttonPos, setButtonPos] = useState({ x: 100, y: 100 });
const [buttonVel, setButtonVel] = useState({ x: 3, y: 2 });

// Animation runs at 60fps via requestAnimationFrame
// Button bounces off viewport edges
// Only active when: sell mode + wallet connected + valid quote
```

This creates memorable UX and slight friction on sells (for the lols).

---

## Transaction Flow

### Fresh Quote Pattern

To avoid "Transaction expired" errors, we fetch a **fresh quote** right before execution:

```typescript
async function handleSwap() {
  // 1. Fetch FRESH quote (with current blockhash)
  const freshQuote = await getSwapQuote(inputMint, outputMint, amount, slippageBps);

  // 2. Build transaction immediately
  const { transaction } = await buildSwapTransaction(connection, freshQuote.quote);

  // 3. Sign and send (blockhash is still valid)
  const signed = await signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());
}
```

This prevents stale blockhash issues that occur when users review quotes for too long.

---

## Troubleshooting

### Quote fails to fetch
- Check Jupiter API status
- Verify token mints are correct
- Check network connectivity

### Transaction expired
- Fresh quote pattern should prevent this
- If still occurring, reduce time between quote and submit
- Check Solana network congestion

### Price impact too high
- Reduce swap amount
- Try at different time (lower liquidity periods)
- Check if liquidity pool has issues

### DVD button hard to catch
- That's the point :)
- Button stays within viewport bounds
- Keep trying, it's possible

---

## Future Improvements

- [ ] Limit orders via Jupiter Limit Order API
- [ ] Price alerts
- [ ] Swap history display
- [ ] Multiple token pairs (not just SOL/$CC)
