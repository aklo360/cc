//! Account structures and types for CC Casino

use anchor_lang::prelude::*;

// ============ GAME TYPES ============

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum GameType {
    CoinFlip,
    Crash,
    Jackpot,
    Gacha,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum CoinChoice {
    Heads,
    Tails,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BetOutcome {
    Pending,
    Win,
    Lose,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RoundPhase {
    Betting,
    Active,
    Ended,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PrizeTier {
    Common,    // 74% - 0.5x
    Rare,      // 20% - 2x
    Epic,      // 5% - 5x
    Legendary, // 1% - 10x
}

// ============ CONFIG ============

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct GameConfig {
    /// Minimum bet amount in token lamports
    pub min_bet: u64,

    /// Maximum bet amount in token lamports
    pub max_bet: u64,

    /// House edge in basis points (100 = 1%)
    pub house_edge_bps: u16,

    /// Platform fee per play in SOL lamports
    pub platform_fee_lamports: u64,

    /// Minimum seconds between bets from same wallet
    pub cooldown_seconds: u16,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            min_bet: 1_000_000,          // 1 $CC
            max_bet: 1_000_000_000,      // 1000 $CC
            house_edge_bps: 200,         // 2%
            platform_fee_lamports: 1_000_000, // 0.001 SOL
            cooldown_seconds: 0,         // No cooldown
        }
    }
}

// ============ ACCOUNTS ============

/// Main game state account
#[account]
pub struct GameState {
    /// Game authority (brain wallet)
    pub authority: Pubkey,

    /// Game type
    pub game_type: GameType,

    /// URL slug for this game
    pub slug: [u8; 32], // Fixed size for deterministic account size

    /// Game configuration
    pub config: GameConfig,

    /// $CC token mint
    pub cc_mint: Pubkey,

    /// Escrow token account PDA bump
    pub escrow_bump: u8,

    /// Is game currently active?
    pub is_active: bool,

    /// Total volume in token lamports
    pub total_volume: u64,

    /// Total fees collected in SOL lamports
    pub total_fees: u64,

    /// Current round number (for crash/jackpot)
    pub current_round: u32,

    /// Created timestamp
    pub created_at: i64,

    /// Reserved for future use
    pub _reserved: [u8; 64],
}

impl GameState {
    pub const LEN: usize = 8 +  // discriminator
        32 +  // authority
        1 +   // game_type
        32 +  // slug
        (8 + 8 + 2 + 8 + 2) + // config
        32 +  // cc_mint
        1 +   // escrow_bump
        1 +   // is_active
        8 +   // total_volume
        8 +   // total_fees
        4 +   // current_round
        8 +   // created_at
        64;   // reserved

    pub fn slug_as_str(&self) -> String {
        String::from_utf8_lossy(&self.slug)
            .trim_end_matches('\0')
            .to_string()
    }
}

/// Individual bet/play record
#[account]
pub struct PlayerBet {
    /// Player wallet
    pub player: Pubkey,

    /// Game this bet is for
    pub game: Pubkey,

    /// Round number (for crash/jackpot, 0 for instant games)
    pub round_number: u32,

    /// Bet amount in token lamports
    pub bet_amount: u64,

    /// Platform fee paid in SOL lamports
    pub fee_amount: u64,

    /// Bet choice (for coinflip: heads/tails)
    pub bet_choice: u8,

    /// Outcome (pending/win/lose)
    pub outcome: BetOutcome,

    /// Payout amount (0 if pending or lost)
    pub payout_amount: u64,

    /// VRF result used for resolution
    pub vrf_result: [u8; 32],

    /// Timestamp of bet
    pub bet_at: i64,

    /// Timestamp of resolution (0 if pending)
    pub resolved_at: i64,

    /// Bump for PDA
    pub bump: u8,
}

impl PlayerBet {
    pub const LEN: usize = 8 +  // discriminator
        32 +  // player
        32 +  // game
        4 +   // round_number
        8 +   // bet_amount
        8 +   // fee_amount
        1 +   // bet_choice
        1 +   // outcome
        8 +   // payout_amount
        32 +  // vrf_result
        8 +   // bet_at
        8 +   // resolved_at
        1;    // bump
}

/// Round state for multi-player games (crash/jackpot)
#[account]
pub struct RoundState {
    /// Game this round belongs to
    pub game: Pubkey,

    /// Round number
    pub round_number: u32,

    /// Current phase
    pub phase: RoundPhase,

    /// Total pool size in token lamports
    pub pool_size: u64,

    /// Number of participants
    pub participant_count: u32,

    /// VRF result (set after resolution)
    pub vrf_result: [u8; 32],

    /// Result data (crash point, winner, etc.)
    pub result: [u8; 32],

    /// Round start timestamp
    pub started_at: i64,

    /// Betting end timestamp
    pub betting_ends_at: i64,

    /// Round end timestamp
    pub ended_at: i64,

    /// Bump for PDA
    pub bump: u8,
}

impl RoundState {
    pub const LEN: usize = 8 +  // discriminator
        32 +  // game
        4 +   // round_number
        1 +   // phase
        8 +   // pool_size
        4 +   // participant_count
        32 +  // vrf_result
        32 +  // result
        8 +   // started_at
        8 +   // betting_ends_at
        8 +   // ended_at
        1;    // bump
}

/// Player state within a round (for crash tracking)
#[account]
pub struct RoundParticipant {
    /// Player wallet
    pub player: Pubkey,

    /// Round this participation is for
    pub round: Pubkey,

    /// Bet amount
    pub bet_amount: u64,

    /// Has cashed out?
    pub cashed_out: bool,

    /// Cashout multiplier (in basis points, 10000 = 1.00x)
    pub cashout_multiplier: u32,

    /// Payout received (0 if not cashed out or crashed)
    pub payout: u64,

    /// Join timestamp
    pub joined_at: i64,

    /// Cashout timestamp
    pub cashed_out_at: i64,

    /// Bump for PDA
    pub bump: u8,
}

impl RoundParticipant {
    pub const LEN: usize = 8 +  // discriminator
        32 +  // player
        32 +  // round
        8 +   // bet_amount
        1 +   // cashed_out
        4 +   // cashout_multiplier
        8 +   // payout
        8 +   // joined_at
        8 +   // cashed_out_at
        1;    // bump
}

/// Gacha pull result
#[account]
pub struct GachaPullResult {
    /// Player wallet
    pub player: Pubkey,

    /// Game this pull is for
    pub game: Pubkey,

    /// Number of pulls
    pub pull_count: u8,

    /// Prize tiers won (up to 10 pulls)
    pub tiers: [u8; 10],

    /// Total payout
    pub total_payout: u64,

    /// VRF result
    pub vrf_result: [u8; 32],

    /// Resolved?
    pub resolved: bool,

    /// Pull timestamp
    pub pulled_at: i64,

    /// Bump for PDA
    pub bump: u8,
}

impl GachaPullResult {
    pub const LEN: usize = 8 +  // discriminator
        32 +  // player
        32 +  // game
        1 +   // pull_count
        10 +  // tiers
        8 +   // total_payout
        32 +  // vrf_result
        1 +   // resolved
        8 +   // pulled_at
        1;    // bump
}

// ============ HELPER FUNCTIONS ============

impl PrizeTier {
    pub fn from_random(random: u8) -> Self {
        // random is 0-255
        // 0-189 (74%) = Common
        // 190-240 (20%) = Rare
        // 241-252 (5%) = Epic
        // 253-255 (1%) = Legendary
        match random {
            0..=189 => PrizeTier::Common,
            190..=240 => PrizeTier::Rare,
            241..=252 => PrizeTier::Epic,
            _ => PrizeTier::Legendary,
        }
    }

    pub fn multiplier_bps(&self) -> u32 {
        match self {
            PrizeTier::Common => 5000,     // 0.5x
            PrizeTier::Rare => 20000,      // 2x
            PrizeTier::Epic => 50000,      // 5x
            PrizeTier::Legendary => 100000, // 10x
        }
    }
}

/// Calculate crash point from VRF result
/// Uses exponential distribution with 3% house edge
pub fn calculate_crash_point(vrf_result: &[u8; 32]) -> u32 {
    // Use first 4 bytes as u32 for randomness
    let random = u32::from_le_bytes([vrf_result[0], vrf_result[1], vrf_result[2], vrf_result[3]]);
    let normalized = (random as f64) / (u32::MAX as f64);

    // House edge adjustment
    let house_edge = 0.03;
    let adjusted = normalized * (1.0 - house_edge);

    if adjusted == 0.0 {
        return 100; // Instant crash (1.00x)
    }

    // Exponential distribution: crash = 0.99 / (1 - adjusted)
    let crash = 0.99 / (1.0 - adjusted);
    let crash_bps = (crash * 10000.0) as u32;

    // Clamp between 1.00x and 100.00x
    crash_bps.clamp(10000, 1000000)
}

/// Calculate coin flip result from VRF
pub fn calculate_coinflip_result(vrf_result: &[u8; 32]) -> CoinChoice {
    if vrf_result[0] % 2 == 0 {
        CoinChoice::Heads
    } else {
        CoinChoice::Tails
    }
}

/// Calculate jackpot winner index from VRF
pub fn calculate_jackpot_winner(vrf_result: &[u8; 32], total_tickets: u32) -> u32 {
    let random = u32::from_le_bytes([vrf_result[0], vrf_result[1], vrf_result[2], vrf_result[3]]);
    random % total_tickets
}
