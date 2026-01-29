# Crypto/Fintech Safety

> **This rule exists because of a catastrophic incident where 1.68M tokens were accidentally burned (2026-01-27).**

---

## Absolute Requirements for Financial Code

### 1. NEVER Test Financial Operations on Mainnet First
- ALL new financial features MUST be tested on devnet/testnet first
- Use mock/simulation mode before any real transaction
- Only after 3+ successful devnet tests, proceed to mainnet with MINIMAL amounts

### 2. ALWAYS Validate Amounts Before Irreversible Operations
```typescript
// REQUIRED pattern for ANY burn/transfer/swap:
if (amount > currentBalance) {
  throw new Error(`SAFETY STOP: Amount exceeds balance`);
}
if (amount > MAX_SAFE_AMOUNT) {
  throw new Error(`SAFETY STOP: Amount exceeds safety limit`);
}
console.log(`[VALIDATION] Balance: ${balance}, Amount: ${amount}, Remaining: ${balance - amount}`);
```

### 3. ALWAYS Add Safety Caps
- Burns: MAX 1M tokens per transaction
- Transfers: MAX 100M tokens per transaction
- Swaps: MAX 10 SOL per transaction
- These caps can be raised ONLY with explicit user approval

### 4. ALWAYS Implement Dry-Run Mode
Every financial function MUST have a `dryRun` parameter:
```typescript
function dangerousFinancialOperation(amount: number, dryRun = false) {
  if (dryRun) {
    console.log(`[DRY RUN] Would execute: ${operation} with ${amount}`);
    return { dryRun: true, wouldExecute: { ... } };
  }
  // ... actual execution
}
```

### 5. NEVER Burn/Transfer "Entire Balance"
- NEVER use `wallet.getBalance()` as the amount to burn/transfer
- ALWAYS use the specific amount from the operation (e.g., swap output)
- If you need to move "everything", calculate the exact amount first and validate

### 6. ALWAYS Log Before Irreversible Operations
```typescript
console.log(`[CRITICAL] About to burn ${amount} tokens`);
console.log(`[CRITICAL] Current balance: ${balance}`);
console.log(`[CRITICAL] After operation: ${balance - amount}`);
```

### 7. ALWAYS Ask Before Implementing Financial Features
Before writing ANY code that:
- Transfers tokens
- Burns tokens
- Swaps tokens
- Withdraws funds
- Modifies wallet balances

ASK THE USER:
- "Should I implement dry-run mode first?"
- "What are the safety limits you want?"
- "Should we test on devnet first?"

---

## Forbidden Patterns

```typescript
// FORBIDDEN: Burning entire balance
const balance = await getBalance();
await burn(balance); // NEVER DO THIS

// FORBIDDEN: Transferring without validation
await transfer(destination, amount); // NEVER without balance check

// FORBIDDEN: Testing on mainnet first
await mainnetSwap(amount); // NEVER before devnet testing

// FORBIDDEN: No safety caps
await burn(userProvidedAmount); // NEVER without MAX limit
```

---

## 3-Wallet Architecture (Implemented 2026-01-27)

After the 1.68M burn incident, we now use a 3-wallet architecture for maximum security:

```
┌─────────────────────────┐
│     REWARDS WALLET      │  ← Cold Storage (9M $CC)
│     (Ultra Secure)      │
│  • Never used by games  │
│  • Only tops up game    │
│  • Max 1M/day transfer  │
└───────────┬─────────────┘
            │
   Daily top-up (if < 300K)
            │
            ▼
┌─────────────────────────┐
│      GAME WALLET        │  ← Hot Wallet (1M $CC)
│    (Current Brain)      │
│  • Game payouts only    │
│  • Max 100K per payout  │
│  • Max 500K/day payouts │
└───────────┬─────────────┘
            │
       Game payouts
            │
            ▼
        Players

┌─────────────────────────┐
│      BURN WALLET        │  ← Airlock (for buyback & burn)
│      (Airlock)          │
│  • Burns only           │
└─────────────────────────┘
```

### Limits (Locked In)

| Wallet | Balance | Max Single TX | Daily Limit |
|--------|---------|---------------|-------------|
| **Rewards** (cold) | 9M $CC | 1M (to game only) | 1M |
| **Game** (hot) | 1M $CC | 100K (to players) | 500K payouts |
| **Burn** (airlock) | 0 (temp) | 1M | - |

### Runway (1-3 month target)

| Scenario | Daily Loss | Pool Lasts |
|----------|-----------|------------|
| House edge works | +profit | ∞ |
| Light losses | -100K | 100 days |
| Medium losses | -200K | 50 days |
| Heavy losses | -333K | 30 days |

### Why This Is Safer
- Even if a game has a critical bug, max loss is 1M $CC (game wallet)
- Rewards wallet is NEVER touched by game code
- Daily limits + circuit breakers prevent rapid drainage
- Clear separation of concerns

---

## API Endpoints

- `GET /rewards/status` - Cold storage wallet state + limits
- `POST /rewards/create` - Create rewards wallet (one-time)
- `POST /rewards/import` - Import existing rewards wallet
- `POST /rewards/top-up` - Manual top-up trigger
- `GET /game-wallet/status` - Hot wallet state + daily stats
- `GET /limits` - All system limits
- `GET /wallet-system/status` - Full 3-wallet system status
- `GET /burn-wallet/status` - Burn wallet state
- `POST /burn-wallet/create` - Create burn wallet (one-time)
- `POST /buyback/trigger` - Automatically uses airlock if burn wallet exists

---

## Key Files

- `brain/src/wallet.ts` - All 3 wallet tables, create/load functions
- `brain/src/rewards.ts` - Limits, circuit breakers, top-up logic
- `brain/src/buyback.ts` - Airlock pattern implementation
- `brain/src/solana.ts` - `ensureRewardsWalletAta()`, `ensureBurnWalletAta()`, `transferToBurnWallet()`
- `brain/src/db.ts` - `daily_payout_stats`, `daily_transfer_stats` tables

---

## Daily Cron Jobs

- Midnight UTC: Check if game wallet < 300K, top-up from rewards if needed
- Every 6 hours: Buyback & burn (SOL fees → buy $CC → burn)

---

## Migration Steps

1. Create rewards wallet: `POST /rewards/create`
2. Send 9M $CC to rewards wallet address
3. Verify with: `GET /rewards/status`
4. Game wallet is existing brain wallet (no change)
5. Daily cron auto-tops up game wallet as needed

---

## Required Code Review Checklist

Before ANY PR with financial code:
- [ ] Balance validation before operation?
- [ ] Safety caps in place?
- [ ] Dry-run mode available?
- [ ] Logging before irreversible operations?
- [ ] Tested on devnet first?
- [ ] Amount source is SPECIFIC, not "entire balance"?
- [ ] Uses burn wallet airlock pattern for burns?
- [ ] Uses circuit breaker check before payouts?
- [ ] Payouts come from GAME wallet, not rewards wallet?
- [ ] Daily limits respected?
