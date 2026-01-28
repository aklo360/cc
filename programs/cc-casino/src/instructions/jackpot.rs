//! Jackpot game instructions

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{*, calculate_jackpot_winner};
use crate::{BetPlaced, JackpotWon, CasinoError};

#[derive(Accounts)]
pub struct EnterJackpot<'info> {
    /// Player
    #[account(mut)]
    pub player: Signer<'info>,

    /// Game state
    #[account(
        constraint = game_state.is_active @ CasinoError::GameNotActive,
        constraint = game_state.game_type == GameType::Jackpot @ CasinoError::GameNotActive,
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
        init_if_needed,
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

pub fn enter_handler(ctx: Context<EnterJackpot>, ticket_amount: u64) -> Result<()> {
    let game = &ctx.accounts.game_state;
    let round = &mut ctx.accounts.round_state;
    let participant = &mut ctx.accounts.participant;
    let clock = Clock::get()?;

    // Validate bet (ticket_amount is number of tickets, each ticket = min_bet)
    let bet_amount = ticket_amount.checked_mul(game.config.min_bet).unwrap();
    require!(bet_amount <= game.config.max_bet, CasinoError::BetTooLarge);

    // Transfer tokens
    let cpi_accounts = Transfer {
        from: ctx.accounts.player_token_account.to_account_info(),
        to: ctx.accounts.escrow.to_account_info(),
        authority: ctx.accounts.player.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, bet_amount)?;

    // Update or initialize participant
    if participant.joined_at == 0 {
        participant.player = ctx.accounts.player.key();
        participant.round = round.key();
        participant.bet_amount = bet_amount;
        participant.joined_at = clock.unix_timestamp;
        participant.bump = ctx.bumps.participant;
        round.participant_count += 1;
    } else {
        participant.bet_amount = participant.bet_amount.checked_add(bet_amount).unwrap();
    }

    // Update round pool
    round.pool_size = round.pool_size.checked_add(bet_amount).unwrap();

    emit!(BetPlaced {
        game: game.key(),
        player: ctx.accounts.player.key(),
        bet_amount,
        fee_amount: game.config.platform_fee_lamports,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct DrawJackpot<'info> {
    /// VRF authority
    pub vrf_authority: Signer<'info>,

    /// Game state
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    /// Round to draw
    #[account(
        mut,
        constraint = round_state.phase == RoundPhase::Betting @ CasinoError::RoundEnded,
        seeds = [b"round", game_state.key().as_ref(), &round_state.round_number.to_le_bytes()],
        bump = round_state.bump,
    )]
    pub round_state: Account<'info, RoundState>,

    /// Winner participant
    /// CHECK: We'll find the winner from VRF
    pub winner: AccountInfo<'info>,

    /// Winner's token account
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = winner,
    )]
    pub winner_token_account: Account<'info, TokenAccount>,

    /// Escrow
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = game_state,
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

pub fn draw_handler(ctx: Context<DrawJackpot>, vrf_result: [u8; 32]) -> Result<()> {
    let game = &ctx.accounts.game_state;
    let round = &mut ctx.accounts.round_state;
    let clock = Clock::get()?;

    // Calculate winner index (simplified - in production, iterate through all participants)
    let total_tickets = round.pool_size / game.config.min_bet;
    let _winner_index = calculate_jackpot_winner(&vrf_result, total_tickets as u32);

    // Calculate payout (5% house cut)
    let house_cut = (round.pool_size * game.config.house_edge_bps as u64) / 10000;
    let payout = round.pool_size - house_cut;

    // Transfer payout
    let slug = game.slug_as_str();
    let seeds = &[b"game".as_ref(), slug.as_bytes(), &[game.escrow_bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.winner_token_account.to_account_info(),
        authority: ctx.accounts.game_state.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, payout)?;

    // Update round
    round.vrf_result = vrf_result;
    round.phase = RoundPhase::Ended;
    round.ended_at = clock.unix_timestamp;
    round.result[..32].copy_from_slice(ctx.accounts.winner.key.as_ref());

    emit!(JackpotWon {
        game: game.key(),
        winner: ctx.accounts.winner.key(),
        pool_size: round.pool_size,
        payout,
    });

    Ok(())
}
