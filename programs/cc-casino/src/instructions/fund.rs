//! Fund pool instruction

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::CasinoError;

#[derive(Accounts)]
pub struct FundPool<'info> {
    /// Authority (must match game authority)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Game state
    #[account(
        mut,
        has_one = authority @ CasinoError::Unauthorized,
    )]
    pub game_state: Account<'info, GameState>,

    /// Authority's token account
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = authority,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    /// Game escrow token account
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = game_state,
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<FundPool>, amount: u64) -> Result<()> {
    // Transfer tokens to escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.authority_token_account.to_account_info(),
        to: ctx.accounts.escrow.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    msg!(
        "Funded escrow with {} tokens. New balance: {}",
        amount,
        ctx.accounts.escrow.amount + amount
    );

    Ok(())
}
