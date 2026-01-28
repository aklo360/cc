//! Crash game instructions

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::{RoundStarted, RoundEnded, BetPlaced, CashoutEvent, CasinoError};

#[derive(Accounts)]
pub struct StartCrashRound<'info> {
    /// Authority
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Game state
    #[account(
        mut,
        has_one = authority @ CasinoError::Unauthorized,
        constraint = game_state.game_type == GameType::Crash @ CasinoError::GameNotActive,
    )]
    pub game_state: Account<'info, GameState>,

    /// Round state PDA
    #[account(
        init,
        payer = authority,
        space = RoundState::LEN,
        seeds = [b"round", game_state.key().as_ref(), &(game_state.current_round + 1).to_le_bytes()],
        bump
    )]
    pub round_state: Account<'info, RoundState>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn start_round_handler(ctx: Context<StartCrashRound>) -> Result<()> {
    let game = &mut ctx.accounts.game_state;
    let round = &mut ctx.accounts.round_state;
    let clock = Clock::get()?;

    game.current_round += 1;

    round.game = game.key();
    round.round_number = game.current_round;
    round.phase = RoundPhase::Betting;
    round.pool_size = 0;
    round.participant_count = 0;
    round.vrf_result = [0u8; 32];
    round.result = [0u8; 32];
    round.started_at = clock.unix_timestamp;
    round.betting_ends_at = clock.unix_timestamp + 10; // 10 second betting phase
    round.ended_at = 0;
    round.bump = ctx.bumps.round_state;

    emit!(RoundStarted {
        game: game.key(),
        round_number: game.current_round,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct JoinCrash<'info> {
    /// Player
    #[account(mut)]
    pub player: Signer<'info>,

    /// Game state
    #[account(
        constraint = game_state.is_active @ CasinoError::GameNotActive,
    )]
    pub game_state: Account<'info, GameState>,

    /// Current round
    #[account(
        mut,
        constraint = round_state.phase == RoundPhase::Betting @ CasinoError::RoundNotBetting,
        seeds = [b"round", game_state.key().as_ref(), &game_state.current_round.to_le_bytes()],
        bump = round_state.bump,
    )]
    pub round_state: Account<'info, RoundState>,

    /// Participant PDA
    #[account(
        init,
        payer = player,
        space = RoundParticipant::LEN,
        seeds = [b"participant", round_state.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, RoundParticipant>,

    /// Player's token account
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = player,
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// Escrow
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = game_state,
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

pub fn join_handler(ctx: Context<JoinCrash>, bet_amount: u64) -> Result<()> {
    let game = &ctx.accounts.game_state;
    let round = &mut ctx.accounts.round_state;
    let participant = &mut ctx.accounts.participant;
    let clock = Clock::get()?;

    // Validate bet
    require!(bet_amount >= game.config.min_bet, CasinoError::BetTooSmall);
    require!(bet_amount <= game.config.max_bet, CasinoError::BetTooLarge);

    // Transfer bet
    let cpi_accounts = Transfer {
        from: ctx.accounts.player_token_account.to_account_info(),
        to: ctx.accounts.escrow.to_account_info(),
        authority: ctx.accounts.player.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, bet_amount)?;

    // Initialize participant
    participant.player = ctx.accounts.player.key();
    participant.round = round.key();
    participant.bet_amount = bet_amount;
    participant.cashed_out = false;
    participant.cashout_multiplier = 0;
    participant.payout = 0;
    participant.joined_at = clock.unix_timestamp;
    participant.cashed_out_at = 0;
    participant.bump = ctx.bumps.participant;

    // Update round
    round.pool_size = round.pool_size.checked_add(bet_amount).unwrap();
    round.participant_count += 1;

    emit!(BetPlaced {
        game: game.key(),
        player: ctx.accounts.player.key(),
        bet_amount,
        fee_amount: game.config.platform_fee_lamports,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CashoutCrash<'info> {
    /// Player
    #[account(mut)]
    pub player: Signer<'info>,

    /// Game state
    pub game_state: Account<'info, GameState>,

    /// Current round
    #[account(
        constraint = round_state.phase == RoundPhase::Active @ CasinoError::RoundNotBetting,
        seeds = [b"round", game_state.key().as_ref(), &game_state.current_round.to_le_bytes()],
        bump = round_state.bump,
    )]
    pub round_state: Account<'info, RoundState>,

    /// Participant
    #[account(
        mut,
        constraint = !participant.cashed_out @ CasinoError::AlreadyCashedOut,
        seeds = [b"participant", round_state.key().as_ref(), player.key().as_ref()],
        bump = participant.bump,
    )]
    pub participant: Account<'info, RoundParticipant>,

    /// Player's token account
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = player,
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// Escrow
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = game_state,
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// Token program
    pub token_program: Program<'info, Token>,

    /// Current multiplier oracle (simplified - would use Switchboard in production)
    /// CHECK: Read-only oracle data
    pub multiplier_oracle: AccountInfo<'info>,
}

pub fn cashout_handler(ctx: Context<CashoutCrash>) -> Result<()> {
    let game = &ctx.accounts.game_state;
    let participant = &mut ctx.accounts.participant;
    let clock = Clock::get()?;

    // Get current multiplier (simplified - in production, read from oracle/clock-based calculation)
    // For now, use time elapsed as multiplier basis
    let elapsed = clock.unix_timestamp - ctx.accounts.round_state.started_at;
    let multiplier = 10000 + (elapsed as u32 * 100); // 1.00x + 0.01x per second

    // Calculate payout
    let payout = (participant.bet_amount * multiplier as u64) / 10000;

    // Update participant
    participant.cashed_out = true;
    participant.cashout_multiplier = multiplier;
    participant.payout = payout;
    participant.cashed_out_at = clock.unix_timestamp;

    // Transfer payout
    let slug = game.slug_as_str();
    let seeds = &[b"game".as_ref(), slug.as_bytes(), &[game.escrow_bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.player_token_account.to_account_info(),
        authority: ctx.accounts.game_state.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, payout)?;

    emit!(CashoutEvent {
        game: game.key(),
        player: ctx.accounts.player.key(),
        multiplier,
        payout,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveCrash<'info> {
    /// VRF authority
    pub vrf_authority: Signer<'info>,

    /// Game state
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    /// Round to resolve
    #[account(
        mut,
        constraint = round_state.phase != RoundPhase::Ended @ CasinoError::RoundEnded,
        seeds = [b"round", game_state.key().as_ref(), &round_state.round_number.to_le_bytes()],
        bump = round_state.bump,
    )]
    pub round_state: Account<'info, RoundState>,
}

pub fn resolve_handler(ctx: Context<ResolveCrash>, vrf_result: [u8; 32]) -> Result<()> {
    let round = &mut ctx.accounts.round_state;
    let clock = Clock::get()?;

    // Calculate crash point from VRF
    let crash_point = calculate_crash_point(&vrf_result);

    // Store result
    round.vrf_result = vrf_result;
    round.result[..4].copy_from_slice(&crash_point.to_le_bytes());
    round.phase = RoundPhase::Ended;
    round.ended_at = clock.unix_timestamp;

    emit!(RoundEnded {
        game: ctx.accounts.game_state.key(),
        round_number: round.round_number,
        result: format!("{}x", crash_point as f64 / 10000.0),
        pool_size: round.pool_size,
    });

    Ok(())
}
