//! Gacha game instructions

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::{BetPlaced, GachaPull as GachaPullEvent, CasinoError};

#[derive(Accounts)]
pub struct PullGacha<'info> {
    /// Player
    #[account(mut)]
    pub player: Signer<'info>,

    /// Game state
    #[account(
        mut,
        constraint = game_state.is_active @ CasinoError::GameNotActive,
        constraint = game_state.game_type == GameType::Gacha @ CasinoError::GameNotActive,
    )]
    pub game_state: Account<'info, GameState>,

    /// Pull result PDA
    #[account(
        init,
        payer = player,
        space = GachaPullResult::LEN,
        seeds = [b"gacha", game_state.key().as_ref(), player.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub pull_result: Account<'info, GachaPullResult>,

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

pub fn pull_handler(ctx: Context<PullGacha>, pulls: u8) -> Result<()> {
    let game = &mut ctx.accounts.game_state;
    let pull_result = &mut ctx.accounts.pull_result;
    let clock = Clock::get()?;

    // Validate pull count
    require!(pulls >= 1 && pulls <= 10, CasinoError::InvalidPullCount);

    // Calculate total cost
    let cost_per_pull = game.config.min_bet;
    let total_cost = cost_per_pull.checked_mul(pulls as u64).unwrap();
    require!(total_cost <= game.config.max_bet, CasinoError::BetTooLarge);

    // Transfer tokens
    let cpi_accounts = Transfer {
        from: ctx.accounts.player_token_account.to_account_info(),
        to: ctx.accounts.escrow.to_account_info(),
        authority: ctx.accounts.player.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, total_cost)?;

    // Initialize pull result
    pull_result.player = ctx.accounts.player.key();
    pull_result.game = game.key();
    pull_result.pull_count = pulls;
    pull_result.tiers = [0u8; 10];
    pull_result.total_payout = 0;
    pull_result.vrf_result = [0u8; 32];
    pull_result.resolved = false;
    pull_result.pulled_at = clock.unix_timestamp;
    pull_result.bump = ctx.bumps.pull_result;

    // Update game stats
    game.total_volume = game.total_volume.checked_add(total_cost).unwrap();

    emit!(BetPlaced {
        game: game.key(),
        player: ctx.accounts.player.key(),
        bet_amount: total_cost,
        fee_amount: game.config.platform_fee_lamports,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveGacha<'info> {
    /// VRF authority
    pub vrf_authority: Signer<'info>,

    /// Game state
    pub game_state: Account<'info, GameState>,

    /// Pull result to resolve
    #[account(
        mut,
        constraint = !pull_result.resolved @ CasinoError::AlreadyResolved,
    )]
    pub pull_result: Account<'info, GachaPullResult>,

    /// Player
    /// CHECK: Only for key matching
    pub player: AccountInfo<'info>,

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
}

pub fn resolve_handler(ctx: Context<ResolveGacha>, vrf_result: [u8; 32]) -> Result<()> {
    let game = &ctx.accounts.game_state;
    let pull_result = &mut ctx.accounts.pull_result;

    // Determine prizes for each pull
    let cost_per_pull = game.config.min_bet;
    let mut total_payout = 0u64;
    let mut has_rare_or_better = false;

    for i in 0..pull_result.pull_count as usize {
        // Use different bytes of VRF for each pull
        let random_byte = vrf_result[i % 32];
        let tier = PrizeTier::from_random(random_byte);

        // 10-pull guarantee: if last pull and no rare yet, force rare
        if i == 9 && !has_rare_or_better {
            pull_result.tiers[i] = PrizeTier::Rare as u8;
            total_payout = total_payout
                .checked_add((cost_per_pull * PrizeTier::Rare.multiplier_bps() as u64) / 10000)
                .unwrap();
        } else {
            pull_result.tiers[i] = tier as u8;
            total_payout = total_payout
                .checked_add((cost_per_pull * tier.multiplier_bps() as u64) / 10000)
                .unwrap();

            if matches!(tier, PrizeTier::Rare | PrizeTier::Epic | PrizeTier::Legendary) {
                has_rare_or_better = true;
            }
        }
    }

    // Update result
    pull_result.vrf_result = vrf_result;
    pull_result.total_payout = total_payout;
    pull_result.resolved = true;

    // Transfer payout if any
    if total_payout > 0 {
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
        token::transfer(cpi_ctx, total_payout)?;
    }

    // Emit events for each pull
    for i in 0..pull_result.pull_count as usize {
        let tier = match pull_result.tiers[i] {
            0 => PrizeTier::Common,
            1 => PrizeTier::Rare,
            2 => PrizeTier::Epic,
            _ => PrizeTier::Legendary,
        };
        let multiplier = tier.multiplier_bps();
        let payout = (cost_per_pull * multiplier as u64) / 10000;

        emit!(GachaPullEvent {
            game: game.key(),
            player: ctx.accounts.player.key(),
            tier,
            multiplier,
            payout,
        });
    }

    Ok(())
}
