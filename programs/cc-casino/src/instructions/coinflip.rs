//! Coin flip game instructions

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::{BetPlaced, BetResolved, CasinoError};

#[derive(Accounts)]
pub struct PlayCoinflip<'info> {
    /// Player (signer)
    #[account(mut)]
    pub player: Signer<'info>,

    /// Game state
    #[account(
        mut,
        constraint = game_state.is_active @ CasinoError::GameNotActive,
        constraint = game_state.game_type == GameType::CoinFlip @ CasinoError::GameNotActive,
    )]
    pub game_state: Account<'info, GameState>,

    /// Player bet PDA
    #[account(
        init,
        payer = player,
        space = PlayerBet::LEN,
        seeds = [b"bet", game_state.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_bet: Account<'info, PlayerBet>,

    /// Player's token account
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = player,
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// Game escrow
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

pub fn play_handler(
    ctx: Context<PlayCoinflip>,
    bet_amount: u64,
    choice: CoinChoice,
) -> Result<()> {
    let game = &ctx.accounts.game_state;
    let config = &game.config;

    // Validate bet amount
    require!(bet_amount >= config.min_bet, CasinoError::BetTooSmall);
    require!(bet_amount <= config.max_bet, CasinoError::BetTooLarge);

    // Calculate potential payout and check escrow
    let house_edge = config.house_edge_bps as u64;
    let multiplier = 20000 - (house_edge * 2); // 1.96x for 2% edge
    let potential_payout = (bet_amount * multiplier) / 10000;
    require!(
        ctx.accounts.escrow.amount >= potential_payout,
        CasinoError::InsufficientEscrow
    );

    // Transfer bet to escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.player_token_account.to_account_info(),
        to: ctx.accounts.escrow.to_account_info(),
        authority: ctx.accounts.player.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, bet_amount)?;

    // Transfer platform fee (SOL)
    let fee = config.platform_fee_lamports;
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.game_state.to_account_info(),
            },
        ),
        fee,
    )?;

    // Initialize bet record
    let bet = &mut ctx.accounts.player_bet;
    let clock = Clock::get()?;

    bet.player = ctx.accounts.player.key();
    bet.game = ctx.accounts.game_state.key();
    bet.round_number = 0;
    bet.bet_amount = bet_amount;
    bet.fee_amount = fee;
    bet.bet_choice = choice as u8;
    bet.outcome = BetOutcome::Pending;
    bet.payout_amount = 0;
    bet.vrf_result = [0u8; 32];
    bet.bet_at = clock.unix_timestamp;
    bet.resolved_at = 0;
    bet.bump = ctx.bumps.player_bet;

    // Update game stats
    let game = &mut ctx.accounts.game_state;
    game.total_volume = game.total_volume.checked_add(bet_amount).unwrap();
    game.total_fees = game.total_fees.checked_add(fee).unwrap();

    emit!(BetPlaced {
        game: ctx.accounts.game_state.key(),
        player: ctx.accounts.player.key(),
        bet_amount,
        fee_amount: fee,
    });

    msg!(
        "Coin flip bet placed: {} tokens on {:?}",
        bet_amount,
        choice
    );

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveCoinflip<'info> {
    /// VRF authority (Switchboard callback)
    pub vrf_authority: Signer<'info>,

    /// Game state
    #[account(mut)]
    pub game_state: Account<'info, GameState>,

    /// Player bet to resolve
    #[account(
        mut,
        constraint = player_bet.outcome == BetOutcome::Pending @ CasinoError::AlreadyResolved,
        seeds = [b"bet", game_state.key().as_ref(), player.key().as_ref()],
        bump = player_bet.bump,
    )]
    pub player_bet: Account<'info, PlayerBet>,

    /// Player wallet (for payout)
    /// CHECK: Only used for key matching
    pub player: AccountInfo<'info>,

    /// Player's token account
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = player,
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// Game escrow
    #[account(
        mut,
        associated_token::mint = game_state.cc_mint,
        associated_token::authority = game_state,
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

pub fn resolve_handler(ctx: Context<ResolveCoinflip>, vrf_result: [u8; 32]) -> Result<()> {
    let bet = &mut ctx.accounts.player_bet;
    let game = &ctx.accounts.game_state;
    let clock = Clock::get()?;

    // Determine result from VRF
    let result = calculate_coinflip_result(&vrf_result);
    let choice = if bet.bet_choice == 0 {
        CoinChoice::Heads
    } else {
        CoinChoice::Tails
    };
    let won = result == choice;

    // Calculate payout
    let payout = if won {
        let house_edge = game.config.house_edge_bps as u64;
        let multiplier = 20000 - (house_edge * 2);
        (bet.bet_amount * multiplier) / 10000
    } else {
        0
    };

    // Update bet record
    bet.outcome = if won { BetOutcome::Win } else { BetOutcome::Lose };
    bet.payout_amount = payout;
    bet.vrf_result = vrf_result;
    bet.resolved_at = clock.unix_timestamp;

    // Pay out if won
    if payout > 0 {
        let slug = game.slug_as_str();
        let seeds = &[
            b"game".as_ref(),
            slug.as_bytes(),
            &[game.escrow_bump],
        ];
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
    }

    emit!(BetResolved {
        game: ctx.accounts.game_state.key(),
        player: ctx.accounts.player.key(),
        outcome: bet.outcome,
        payout,
        vrf_proof: vrf_result,
    });

    msg!(
        "Coin flip resolved: {:?} - {} {} tokens",
        result,
        if won { "Won" } else { "Lost" },
        if won { payout } else { bet.bet_amount }
    );

    Ok(())
}
