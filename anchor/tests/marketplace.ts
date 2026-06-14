import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { AnchorNftMarketplace } from "../target/types/anchor_nft_marketplace";
import { 
  TOKEN_PROGRAM_ID, 
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import { assert } from "chai";

describe("anchor-nft-marketplace", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnchorNftMarketplace as Program<AnchorNftMarketplace>;

  const admin = provider.wallet as anchor.Wallet;

  const { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Transaction } = anchor.web3;
  
  // Create test accounts
  const maker = Keypair.generate();
  const taker = Keypair.generate();
  
  const marketplaceName = "Nexus-" + Math.random().toString(36).substring(7);
  
  // Derivations
  const [marketplacePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("marketplace"), Buffer.from(marketplaceName)],
    program.programId
  );
  
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), marketplacePDA.toBuffer()],
    program.programId
  );

  let nftMint: anchor.web3.PublicKey;
  let makerNftAta: anchor.web3.PublicKey;
  let takerNftAta: anchor.web3.PublicKey;
  let vaultPDA: anchor.web3.PublicKey;
  let listingPDA: anchor.web3.PublicKey;

  // Metaplex mock accounts
  const metadataProgram = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), metadataProgram.toBuffer(), marketplacePDA.toBuffer()], // Mock seeds
    metadataProgram
  );
  const [masterEditionPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), metadataProgram.toBuffer(), marketplacePDA.toBuffer(), Buffer.from("edition")], // Mock seeds
    metadataProgram
  );

  async function createMintHelper(
    connection: anchor.web3.Connection,
    payer: anchor.web3.Keypair,
    mintAuthority: anchor.web3.PublicKey,
    freezeAuthority: anchor.web3.PublicKey | null,
    decimals: number
  ): Promise<anchor.web3.PublicKey> {
    const mintKeypair = Keypair.generate();
    const lamports = await connection.getMinimumBalanceForRentExemption(82);
    
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMint2Instruction(
        mintKeypair.publicKey,
        decimals,
        mintAuthority,
        freezeAuthority,
        TOKEN_PROGRAM_ID
      )
    );
    
    await anchor.web3.sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
    return mintKeypair.publicKey;
  }

  async function createAssociatedTokenAccountHelper(
    connection: anchor.web3.Connection,
    payer: anchor.web3.Keypair,
    mint: anchor.web3.PublicKey,
    owner: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    const ata = getAssociatedTokenAddressSync(mint, owner, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        owner,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    await anchor.web3.sendAndConfirmTransaction(connection, transaction, [payer]);
    return ata;
  }

  async function mintToHelper(
    connection: anchor.web3.Connection,
    payer: anchor.web3.Keypair,
    mint: anchor.web3.PublicKey,
    destination: anchor.web3.PublicKey,
    authority: anchor.web3.Keypair,
    amount: number
  ): Promise<void> {
    const transaction = new Transaction().add(
      createMintToInstruction(
        mint,
        destination,
        authority.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    await anchor.web3.sendAndConfirmTransaction(connection, transaction, [payer, authority]);
  }

  before(async () => {
    // Airdrop SOL to maker and taker
    const signature1 = await provider.connection.requestAirdrop(maker.publicKey, 10 * LAMPORTS_PER_SOL);
    const signature2 = await provider.connection.requestAirdrop(taker.publicKey, 10 * LAMPORTS_PER_SOL);
    
    const latestBlockhash1 = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: signature1,
      blockhash: latestBlockhash1.blockhash,
      lastValidBlockHeight: latestBlockhash1.lastValidBlockHeight
    });
    
    const latestBlockhash2 = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: signature2,
      blockhash: latestBlockhash2.blockhash,
      lastValidBlockHeight: latestBlockhash2.lastValidBlockHeight
    });

    // Create NFT Mint
    nftMint = await createMintHelper(
      provider.connection,
      maker, // payer
      maker.publicKey, // mintAuthority
      null, // freezeAuthority
      0 // decimals
    );

    // Create ATAs for maker and taker
    makerNftAta = await createAssociatedTokenAccountHelper(
      provider.connection,
      maker, // payer
      nftMint,
      maker.publicKey
    );

    takerNftAta = getAssociatedTokenAddressSync(nftMint, taker.publicKey);

    // Mint 1 token to maker ATA
    await mintToHelper(
      provider.connection,
      maker, // payer
      nftMint,
      makerNftAta,
      maker, // mintAuthority
      1 // amount
    );

    // Derive listing PDA
    [listingPDA] = PublicKey.findProgramAddressSync(
      [marketplacePDA.toBuffer(), nftMint.toBuffer()],
      program.programId
    );

    // Vault PDA is the ATA of the listing account
    vaultPDA = getAssociatedTokenAddressSync(nftMint, listingPDA, true);
  });

  it("Initializes the marketplace", async () => {
    const fee = 250; // 2.5%

    const tx = await program.methods
      .initializeMarketplace(marketplaceName, fee)
      .accounts({
        admin: admin.publicKey,
        marketplace: marketplacePDA,
        treasury: treasuryPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Fetch and check marketplace account
    const marketplaceAccount = await program.account.marketplace.fetch(marketplacePDA);
    assert.equal(marketplaceAccount.name, marketplaceName);
    assert.equal(marketplaceAccount.feeBps, fee);
    assert.equal(marketplaceAccount.authority.toBase58(), admin.publicKey.toBase58());
    assert.equal(marketplaceAccount.treasury.toBase58(), treasuryPDA.toBase58());
  });

  it("Fails to initialize marketplace with empty name", async () => {
    const badMarketplaceName = "";
    const [badMarketplacePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("marketplace"), Buffer.from(badMarketplaceName)],
      program.programId
    );
    const [badTreasuryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), badMarketplacePDA.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeMarketplace(badMarketplaceName, 250)
        .accounts({
          admin: admin.publicKey,
          marketplace: badMarketplacePDA,
          treasury: badTreasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with NameNotValid error");
    } catch (err: any) {
      assert.include(err.message, "NameNotValid");
    }
  });

  it("Fails to initialize marketplace with fee > 100%", async () => {
    const badMarketplaceName = "BadMarket";
    const [badMarketplacePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("marketplace"), Buffer.from(badMarketplaceName)],
      program.programId
    );
    const [badTreasuryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), badMarketplacePDA.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeMarketplace(badMarketplaceName, 10001) // 100.01%
        .accounts({
          admin: admin.publicKey,
          marketplace: badMarketplacePDA,
          treasury: badTreasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with FeeTooHigh error");
    } catch (err: any) {
      assert.include(err.message, "FeeTooHigh");
    }
  });

  it("Lists the NFT on the marketplace", async () => {
    const price = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

    const tx = await program.methods
      .listNft(price)
      .accounts({
        maker: maker.publicKey,
        marketplace: marketplacePDA,
        makerNftMint: nftMint,
        makerNftAta: makerNftAta,
        vault: vaultPDA,
        listing: listingPDA,
        metadata: metadataPDA,
        masterEdition: masterEditionPDA,
        metadataProgram: metadataProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    // Fetch and check listing account
    const listingAccount = await program.account.listing.fetch(listingPDA);
    assert.equal(listingAccount.maker.toBase58(), maker.publicKey.toBase58());
    assert.equal(listingAccount.nftMint.toBase58(), nftMint.toBase58());
    assert.equal(listingAccount.price.toString(), price.toString());

    // Verify NFT is now in the vault ATA owned by the listing PDA
    const vaultTokenAccount = await provider.connection.getTokenAccountBalance(vaultPDA);
    assert.equal(vaultTokenAccount.value.amount, "1");
  });

  it("Fails to list NFT for 0 SOL", async () => {
    // Create another NFT to test
    const testNftMint = await createMintHelper(
      provider.connection,
      maker,
      maker.publicKey,
      null,
      0
    );
    const testMakerNftAta = await createAssociatedTokenAccountHelper(
      provider.connection,
      maker,
      testNftMint,
      maker.publicKey
    );
    await mintToHelper(
      provider.connection,
      maker,
      testNftMint,
      testMakerNftAta,
      maker,
      1
    );
    const [testListingPDA] = PublicKey.findProgramAddressSync(
      [marketplacePDA.toBuffer(), testNftMint.toBuffer()],
      program.programId
    );
    const testVaultPDA = getAssociatedTokenAddressSync(testNftMint, testListingPDA, true);

    try {
      await program.methods
        .listNft(new anchor.BN(0))
        .accounts({
          maker: maker.publicKey,
          marketplace: marketplacePDA,
          makerNftMint: testNftMint,
          makerNftAta: testMakerNftAta,
          vault: testVaultPDA,
          listing: testListingPDA,
          metadata: metadataPDA,
          masterEdition: masterEditionPDA,
          metadataProgram: metadataProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([maker])
        .rpc();
      assert.fail("Should have failed with PriceMustBePositive error");
    } catch (err: any) {
      assert.include(err.message, "PriceMustBePositive");
    }
  });

  it("Delists the NFT and returns it to the maker", async () => {
    // Delist the NFT
    const tx = await program.methods
      .delistNft()
      .accounts({
        maker: maker.publicKey,
        marketplace: marketplacePDA,
        makerNftMint: nftMint,
        makerNftAta: makerNftAta,
        vault: vaultPDA,
        listing: listingPDA,
        metadata: metadataPDA,
        masterEdition: masterEditionPDA,
        metadataProgram: metadataProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    // Verify NFT is returned to maker ATA
    const makerTokenAccount = await provider.connection.getTokenAccountBalance(makerNftAta);
    assert.equal(makerTokenAccount.value.amount, "1");

    // Verify listing and vault accounts are closed
    const listingAccountInfo = await provider.connection.getAccountInfo(listingPDA);
    assert.isNull(listingAccountInfo);
    const vaultAccountInfo = await provider.connection.getAccountInfo(vaultPDA);
    assert.isNull(vaultAccountInfo);
  });

  it("Purchases the NFT successfully", async () => {
    // List it again first
    const price = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL
    await program.methods
      .listNft(price)
      .accounts({
        maker: maker.publicKey,
        marketplace: marketplacePDA,
        makerNftMint: nftMint,
        makerNftAta: makerNftAta,
        vault: vaultPDA,
        listing: listingPDA,
        metadata: metadataPDA,
        masterEdition: masterEditionPDA,
        metadataProgram: metadataProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    // Record balances before purchase
    const makerBalanceBefore = await provider.connection.getBalance(maker.publicKey);
    const treasuryBalanceBefore = await provider.connection.getBalance(treasuryPDA);

    // Purchase the NFT
    const tx = await program.methods
      .purchaseNft()
      .accounts({
        taker: taker.publicKey,
        maker: maker.publicKey,
        marketplace: marketplacePDA,
        takerNftAta: takerNftAta,
        vault: vaultPDA,
        listing: listingPDA,
        treasury: treasuryPDA,
        makerNftMint: nftMint,
        metadata: metadataPDA,
        masterEdition: masterEditionPDA,
        metadataProgram: metadataProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();

    // Verify NFT is now in taker ATA
    const takerTokenAccount = await provider.connection.getTokenAccountBalance(takerNftAta);
    assert.equal(takerTokenAccount.value.amount, "1");

    // Verify listing and vault accounts are closed
    const listingAccountInfo = await provider.connection.getAccountInfo(listingPDA);
    assert.isNull(listingAccountInfo);
    const vaultAccountInfo = await provider.connection.getAccountInfo(vaultPDA);
    assert.isNull(vaultAccountInfo);

    // Verify funds were split correctly
    // Price = 1 SOL = 1,000,000,000 lamports
    // Fee = 2.5% = 25,000,000 lamports
    // Payout = 975,000,000 lamports
    const makerBalanceAfter = await provider.connection.getBalance(maker.publicKey);
    const treasuryBalanceAfter = await provider.connection.getBalance(treasuryPDA);

    // Rent recovery for listing PDA (113 bytes space + header = ~2.35M lamports)
    // is returned to maker because of close = maker in purchase_nft.
    // So maker balance should increase by payout + rent.
    assert.isAbove(makerBalanceAfter, makerBalanceBefore);
    assert.equal((treasuryBalanceAfter - treasuryBalanceBefore).toString(), "25000000");
  });

  it("Updates the marketplace fee BPS", async () => {
    const newFee = 150; // 1.5%

    const tx = await program.methods
      .updateFee(newFee)
      .accounts({
        admin: admin.publicKey,
        marketplace: marketplacePDA,
      })
      .rpc();

    // Verify updated fee
    const marketplaceAccount = await program.account.marketplace.fetch(marketplacePDA);
    assert.equal(marketplaceAccount.feeBps, newFee);
  });

  it("Fails to update fee if not admin", async () => {
    try {
      await program.methods
        .updateFee(100)
        .accounts({
          admin: maker.publicKey, // Not the authorized admin
          marketplace: marketplacePDA,
        })
        .signers([maker])
        .rpc();
      assert.fail("Should have failed with constraint error or InvalidListingOwner");
    } catch (err: any) {
      assert.include(err.message, "InvalidListingOwner");
    }
  });
});
