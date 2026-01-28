//! CC Casino - On-chain gambling games for $CC token
//!
//! This program handles multiple game types:
//! - Coin Flip: 50/50 double or nothing
//! - Crash: Watch multiplier rise, cash out before crash
//! - Jackpot: Pool bets, one winner takes all
//! - Gacha: Pull for tiered prizes
//!
//! All games use Switchboard VRF for provably fair randomness.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

pub mod state;
pub mod instructions;

use state::*;
use instructions::*;

declare_id!("3SwtsjFgrxEN6At94hzEx5Tkdh7A6XqQMEyKUQdT7EBT");

#[program]
pub mod cc_casino {
    use super::*;

    // ============ INITIALIZATION ============

    /// Initialize a new game with given configuration
    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        game_type: GameType,
        slug: String,
        config: GameConfig,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, game_type, slug, config)
    }

    /// Fund the game's reward pool
    pub fn fund_pool(ctx: Context<FundPool>, amount: u64) -> Result<()> {
        instructions::fund::handler(ctx, amount)
    }

    /// Withdraw fees from game (authority only)
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    // ============ COIN FLIP ============

    /// Place a coin flip bet
    pub fn play_coinflip(
        ctx: Context<PlayCoinflip>,
        bet_amount: u64,
        choice: CoinChoice,
    ) -> Result<()> {
        instructions::coinflip::play_handler(ctx, bet_amount, choice)
    }

    /// Resolve coin flip with VRF result (called by VRF callback)
    pub fn resolve_coinflip(
        ctx: Context<ResolveCoinflip>,
        vrf_result: [u8; 32],
    ) -> Result<()> {
        instructions::coinflip::resolve_handler(ctx, vrf_result)
    }

    // ============ CRASH ============

    /// Start a new crash round
    pub fn start_crash_round(ctx: Context<StartCrashRound>) -> Result<()> {
        instructions::crash::start_round_handler(ctx)
    }

    /// Join an active crash round with a bet
    pub fn join_crash(ctx: Context<JoinCrash>, bet_amount: u64) -> Result<()> {
        instructions::crash::join_handler(ctx, bet_amount)
    }

    /// Cash out of crash round at current multiplier
    pub fn cashout_crash(ctx: Context<CashoutCrash>) -> Result<()> {
        instructions::crash::cashout_handler(ctx)
    }

    /// Resolve crash round with VRF result (determines crash point)
    pub fn resolve_crash(ctx: Context<ResolveCrash>, vrf_result: [u8; 32]) -> Result<()> {
        instructions::crash::resolve_handler(ctx, vrf_result)
    }

    // ============ JACKPOT ============

    /// Enter jackpot round with ticket purchase
    pub fn enter_jackpot(ctx: Context<EnterJackpot>, ticket_amount: u64) -> Result<()> {
        instructions::jackpot::enter_handler(ctx, ticket_amount)
    }

    /// Draw jackpot winner with VRF result
    pub fn draw_jackpot(ctx: Context<DrawJackpot>, vrf_result: [u8; 32]) -> Result<()> {
        instructions::jackpot::draw_handler(ctx, vrf_result)
    }

    // ============ GACHA ============

    /// Pull gacha (single or multi-pull)
    pub fn pull_gacha(ctx: Context<PullGacha>, pulls: u8) -> Result<()> {
        instructions::gacha::pull_handler(ctx, pulls)
    }

    /// Resolve gacha pulls with VRF result
    pub fn resolve_gacha(ctx: Context<ResolveGacha>, vrf_result: [u8; 32]) -> Result<()> {
        instructions::gacha::resolve_handler(ctx, vrf_result)
    }
}

// ============ ERRORS ============

#[error_code]
pub enum CasinoError {
    #[msg("Bet amount below minimum")]
    BetTooSmall,

    #[msg("Bet amount exceeds maximum")]
    BetTooLarge,

    #[msg("Insufficient escrow balance for payout")]
    InsufficientEscrow,

    #[msg("Game is not active")]
    GameNotActive,

    #[msg("Round is not in betting phase")]
    RoundNotBetting,

    #[msg("Round has already ended")]
    RoundEnded,

    #[msg("Player already in this round")]
    AlreadyJoined,

    #[msg("Player not in this round")]
    NotInRound,

    #[msg("Already cashed out")]
    AlreadyCashedOut,

    #[msg("Cannot cash out after crash")]
    CrashedOut,

    #[msg("Invalid VRF proof")]
    InvalidVrfProof,

    #[msg("Bet already resolved")]
    AlreadyResolved,

    #[msg("Unauthorized - not game authority")]
    Unauthorized,

    #[msg("Invalid number of pulls (1-10)")]
    InvalidPullCount,

    #[msg("Cooldown active - wait before next bet")]
    CooldownActive,
}

// ============ EVENTS ============

#[event]
pub struct GameInitialized {
    pub game: Pubkey,
    pub game_type: GameType,
    pub slug: String,
    pub authority: Pubkey,
}

#[event]
pub struct BetPlaced {
    pub game: Pubkey,
    pub player: Pubkey,
    pub bet_amount: u64,
    pub fee_amount: u64,
}

#[event]
pub struct BetResolved {
    pub game: Pubkey,
    pub player: Pubkey,
    pub outcome: BetOutcome,
    pub payout: u64,
    pub vrf_proof: [u8; 32],
}

#[event]
pub struct RoundStarted {
    pub game: Pubkey,
    pub round_number: u32,
}

#[event]
pub struct RoundEnded {
    pub game: Pubkey,
    pub round_number: u32,
    pub result: String,
    pub pool_size: u64,
}

#[event]
pub struct CashoutEvent {
    pub game: Pubkey,
    pub player: Pubkey,
    pub multiplier: u32,
    pub payout: u64,
}

#[event]
pub struct JackpotWon {
    pub game: Pubkey,
    pub winner: Pubkey,
    pub pool_size: u64,
    pub payout: u64,
}

#[event]
pub struct GachaPull {
    pub game: Pubkey,
    pub player: Pubkey,
    pub tier: PrizeTier,
    pub multiplier: u32,
    pub payout: u64,
}
