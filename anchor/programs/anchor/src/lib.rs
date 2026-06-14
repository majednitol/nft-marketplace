use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked, CloseAccount},
};

declare_id!("7jkmajwshoW56VwjHGwPGbTaSNH25z186VBraqQTEGWN");

#[program]
pub mod anchor_nft_marketplace {
    use super::*;

    pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>, name: String, fee: u16) -> Result<()> {
        require!(name.len() > 0 && name.len() <= 32, MarketplaceError::NameNotValid);
        require!(fee <= 10000, MarketplaceError::FeeTooHigh);

        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.admin.key();
        marketplace.fee_bps = fee;
        marketplace.marketplace_bump = ctx.bumps.marketplace;
        marketplace.treasury = ctx.accounts.treasury.key();
        marketplace.treasury_bump = ctx.bumps.treasury;
        marketplace.name = name;

        Ok(())
    }

    pub fn list_nft(ctx: Context<ListNft>, price: u64) -> Result<()> {
        require!(price > 0, MarketplaceError::PriceMustBePositive);

        let listing = &mut ctx.accounts.listing;
        listing.maker = ctx.accounts.maker.key();
        listing.nft_mint = ctx.accounts.maker_nft_mint.key();
        listing.price = price;
        listing.metadata = ctx.accounts.metadata.key();
        listing.bump = ctx.bumps.listing;

        // Transfer NFT to the vault
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.maker_nft_ata.to_account_info(),
            mint: ctx.accounts.maker_nft_mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.maker.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, transfer_accounts);
        token_interface::transfer_checked(cpi_ctx, 1, ctx.accounts.maker_nft_mint.decimals)?;

        emit!(NFTListed {
            nft_mint: ctx.accounts.maker_nft_mint.key(),
            marketplace: ctx.accounts.marketplace.key(),
            seller: ctx.accounts.maker.key(),
            price,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn purchase_nft(ctx: Context<PurchaseNft>) -> Result<()> {
        let listing = &ctx.accounts.listing;
        let marketplace = &ctx.accounts.marketplace;

        let fee = (listing.price as u128 * marketplace.fee_bps as u128 / 10000) as u64;
        let payout = listing.price - fee;

        // Transfer payout to maker
        let payout_cpi = anchor_lang::system_program::Transfer {
            from: ctx.accounts.taker.to_account_info(),
            to: ctx.accounts.maker.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), payout_cpi);
        anchor_lang::system_program::transfer(cpi_ctx, payout)?;

        // Transfer fee to treasury
        if fee > 0 {
            let fee_cpi = anchor_lang::system_program::Transfer {
                from: ctx.accounts.taker.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            };
            let cpi_ctx_fee = CpiContext::new(ctx.accounts.system_program.to_account_info(), fee_cpi);
            anchor_lang::system_program::transfer(cpi_ctx_fee, fee)?;
        }

        // Signer seeds for the listing PDA
        let marketplace_key = marketplace.key();
        let mint_key = ctx.accounts.maker_nft_mint.key();
        let listing_bump = listing.bump;
        let seeds = &[
            marketplace_key.as_ref(),
            mint_key.as_ref(),
            &[listing_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer NFT to taker
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.maker_nft_mint.to_account_info(),
            to: ctx.accounts.taker_nft_ata.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
                let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_nft = CpiContext::new_with_signer(cpi_program.clone(), transfer_accounts, signer_seeds);
        token_interface::transfer_checked(cpi_ctx_nft, 1, ctx.accounts.maker_nft_mint.decimals)?;

        // Close the vault account
        let close_accounts = CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.maker.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
        let cpi_ctx_close = CpiContext::new_with_signer(cpi_program, close_accounts, signer_seeds);
        token_interface::close_account(cpi_ctx_close)?;

        emit!(NFTPurchased {
            nft_mint: ctx.accounts.maker_nft_mint.key(),
            marketplace: marketplace.key(),
            seller: ctx.accounts.maker.key(),
            buyer: ctx.accounts.taker.key(),
            price: listing.price,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn delist_nft(ctx: Context<DelistNft>) -> Result<()> {
        let marketplace = &ctx.accounts.marketplace;
        let listing = &ctx.accounts.listing;

        // Signer seeds for the listing PDA
        let marketplace_key = marketplace.key();
        let mint_key = ctx.accounts.maker_nft_mint.key();
        let listing_bump = listing.bump;
        let seeds = &[
            marketplace_key.as_ref(),
            mint_key.as_ref(),
            &[listing_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer NFT back to maker
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.maker_nft_mint.to_account_info(),
            to: ctx.accounts.maker_nft_ata.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
                let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program.clone(), transfer_accounts, signer_seeds);
        token_interface::transfer_checked(cpi_ctx, 1, ctx.accounts.maker_nft_mint.decimals)?;

        // Close the vault account
        let close_accounts = CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.maker.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
        let cpi_ctx_close = CpiContext::new_with_signer(cpi_program, close_accounts, signer_seeds);
        token_interface::close_account(cpi_ctx_close)?;

        emit!(NFTDelisted {
            nft_mint: ctx.accounts.maker_nft_mint.key(),
            marketplace: marketplace.key(),
            seller: ctx.accounts.maker.key(),
            price: listing.price,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_fee(ctx: Context<UpdateFee>, updated_fee: u16) -> Result<()> {
        require!(updated_fee <= 10000, MarketplaceError::FeeTooHigh);

        let marketplace = &mut ctx.accounts.marketplace;
        let old_fee = marketplace.fee_bps;
        marketplace.fee_bps = updated_fee;

        emit!(FeeUpdated {
            marketplace: marketplace.key(),
            admin: ctx.accounts.admin.key(),
            old_fee,
            new_fee: updated_fee,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, fee: u16)]
pub struct InitializeMarketplace<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 200, // Matches exactly the size from the IDL structure
        seeds = [b"marketplace", name.as_bytes()],
        bump
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(
        mut,
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump
    )]
    /// CHECK: Treasury PDA to receive fee
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListNft<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        seeds = [b"marketplace", marketplace.name.as_bytes()],
        bump = marketplace.marketplace_bump
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    pub maker_nft_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = maker_nft_mint,
        associated_token::authority = maker,
    )]
    pub maker_nft_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = maker,
        associated_token::mint = maker_nft_mint,
        associated_token::authority = listing,
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = maker,
        space = 113, // Matches exactly the size from the IDL structure
        seeds = [marketplace.key().as_ref(), maker_nft_mint.key().as_ref()],
        bump
    )]
    pub listing: Box<Account<'info, Listing>>,

    /// CHECK: Metaplex Metadata account
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex Master Edition account
    pub master_edition: UncheckedAccount<'info>,

    /// CHECK: Metaplex Metadata Program ID
    pub metadata_program: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct PurchaseNft<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    #[account(
        seeds = [b"marketplace", marketplace.name.as_bytes()],
        bump = marketplace.marketplace_bump
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = maker_nft_mint,
        associated_token::authority = taker,
    )]
    pub taker_nft_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = maker_nft_mint,
        associated_token::authority = listing,
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        close = maker,
        seeds = [marketplace.key().as_ref(), maker_nft_mint.key().as_ref()],
        bump = listing.bump
    )]
    pub listing: Box<Account<'info, Listing>>,

    #[account(
        mut,
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump = marketplace.treasury_bump
    )]
    /// CHECK: Treasury PDA to receive fee
    pub treasury: SystemAccount<'info>,

    pub maker_nft_mint: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: Metaplex Metadata account
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex Master Edition account
    pub master_edition: UncheckedAccount<'info>,

    /// CHECK: Metaplex Metadata Program ID
    pub metadata_program: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct DelistNft<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        seeds = [b"marketplace", marketplace.name.as_bytes()],
        bump = marketplace.marketplace_bump
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    pub maker_nft_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = maker_nft_mint,
        associated_token::authority = maker,
    )]
    pub maker_nft_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = maker_nft_mint,
        associated_token::authority = listing,
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        close = maker,
        has_one = maker @ MarketplaceError::InvalidListingOwner,
        seeds = [marketplace.key().as_ref(), maker_nft_mint.key().as_ref()],
        bump = listing.bump
    )]
    pub listing: Box<Account<'info, Listing>>,

    /// CHECK: Metaplex Metadata account
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex Master Edition account
    pub master_edition: UncheckedAccount<'info>,

    /// CHECK: Metaplex Metadata Program ID
    pub metadata_program: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct UpdateFee<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        constraint = marketplace.authority == admin.key() @ MarketplaceError::InvalidListingOwner,
        seeds = [b"marketplace", marketplace.name.as_bytes()],
        bump = marketplace.marketplace_bump
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,
}

#[account]
pub struct Marketplace {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub marketplace_bump: u8,
    pub treasury: Pubkey,
    pub treasury_bump: u8,
    pub name: String,
}

#[account]
pub struct Listing {
    pub maker: Pubkey,
    pub nft_mint: Pubkey,
    pub price: u64,
    pub metadata: Pubkey,
    pub bump: u8,
}

#[event]
pub struct NFTListed {
    pub nft_mint: Pubkey,
    pub marketplace: Pubkey,
    pub seller: Pubkey,
    pub price: u64,
    pub timestamp: i64,
}

#[event]
pub struct NFTPurchased {
    pub nft_mint: Pubkey,
    pub marketplace: Pubkey,
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub price: u64,
    pub timestamp: i64,
}

#[event]
pub struct NFTDelisted {
    pub nft_mint: Pubkey,
    pub marketplace: Pubkey,
    pub seller: Pubkey,
    pub price: u64,
    pub timestamp: i64,
}

#[event]
pub struct FeeUpdated {
    pub marketplace: Pubkey,
    pub admin: Pubkey,
    pub old_fee: u16,
    pub new_fee: u16,
    pub timestamp: i64,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("The name shouldn't be empty or exceed 32 characters.")]
    NameNotValid,
    #[msg("The fee cannot exceed 10,000 basis points (100%).")]
    FeeTooHigh,
    #[msg("The listing price must be greater than zero.")]
    PriceMustBePositive,
    #[msg("The listing owner does not match the signer.")]
    InvalidListingOwner,
}
