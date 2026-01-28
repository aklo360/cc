//! Initialize game instruction

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::*;
use crate::{GameInitialized, CasinoError};

#[derive(Accounts)]
#[instruction(game_type: GameType, slug: String)]
pub struct InitializeGame<'info> {
    /// Game authority (signer, pays for account creation)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Game state PDA
    #[account(
        init,
        payer = authority,
        space = GameState::LEN,
        seeds = [b"game", slug.as_bytes()],
        bump
    )]
    pub game_state: Account<'info, GameState>,

    /// Escrow token account (holds $CC for payouts)
    #[account(
        init,
        payer = authority,
        associated_token::mint = cc_mint,
        associated_token::authority = game_state,
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// $CC token mint
    pub cc_mint: Account<'info, Mint>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Program<'info, Token>,

    /// Associated token program
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<InitializeGame>,
    game_type: GameType,
    slug: String,
    config: GameConfig,
) -> Result<()> {
    require!(slug.len() <= 32, CasinoError::BetTooSmall); // Reusing error for now

    let game = &mut ctx.accounts.game_state;
    let clock = Clock::get()?;

    // Copy slug to fixed-size array
    let mut slug_bytes = [0u8; 32];
    let slug_slice = slug.as_bytes();
    slug_bytes[..slug_slice.len()].copy_from_slice(slug_slice);

    game.authority = ctx.accounts.authority.key();
    game.game_type = game_type;
    game.slug = slug_bytes;
    game.config = config;
    game.cc_mint = ctx.accounts.cc_mint.key();
    game.escrow_bump = ctx.bumps.game_state;
    game.is_active = true;
    game.total_volume = 0;
    game.total_fees = 0;
    game.current_round = 0;
    game.created_at = clock.unix_timestamp;

    emit!(GameInitialized {
        game: game.key(),
        game_type,
        slug: slug.clone(),
        authority: ctx.accounts.authority.key(),
    });

    msg!("Game initialized: {} ({})", slug, game.key());

    Ok(())
}
