//! Withdraw fees instruction

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::CasinoError;

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    /// Authority (must match game authority)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Game state
    #[account(
        has_one = authority @ CasinoError::Unauthorized,
        seeds = [b"game", game_state.slug_as_str().as_bytes()],
        bump = game_state.escrow_bump,
    )]
    pub game_state: Account<'info, GameState>,

    /// Game escrow token account
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = game_state,
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// Authority's token account (receives withdrawal)
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = authority,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
    let game = &ctx.accounts.game_state;

    // Get signer seeds for escrow PDA
    let slug = game.slug_as_str();
    let seeds = &[
        b"game".as_ref(),
        slug.as_bytes(),
        &[game.escrow_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // Transfer from escrow to authority
    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.authority_token_account.to_account_info(),
        authority: ctx.accounts.game_state.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    msg!(
        "Withdrew {} tokens from escrow. Remaining: {}",
        amount,
        ctx.accounts.escrow.amount - amount
    );

    Ok(())
}
