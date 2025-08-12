import {
    Connection,
    PublicKey,
    ComputeBudgetProgram,
    Transaction
  } from "@solana/web3.js";
  import * as anchor from "@project-serum/anchor";
  import {
    getAssociatedTokenAddressSync,
    TOKEN_2022_PROGRAM_ID,
  } from "@solana/spl-token";
  import dotenv from "dotenv";
  import { ref, get } from "firebase/database";
  import { db } from "../config/firebase";
import { getTournamentPool } from "../gamehub/services";
import { getProgram } from "../staking/services";
dotenv.config();

// Default percentage splits based on updated requirements
const DEFAULT_SPLITS = {
  PRIZE_POOL: 40,    // 40% to tournament's prize pool
  REVENUE_POOL: 50,  // 50% to global revenue pool
  STAKING_REWARD_POOL: 5,   // 5% to reward pool
  BURN: 5            // 5% to burn (2.5% Kaya and 2.5% CRD)
};

  
  /**
 * Distribute tournament revenue according to the specified percentages
 * @param tournamentId - The tournament ID
 * @param prizePercentage - Percentage for prize pool (default 40%)
 * @param revenuePercentage - Percentage for revenue pool (default 50%)
 * @param stakingRewardPercentage - Percentage for staking reward pool (default 5%)
 * @param burnPercentage - Percentage for burn (default 5%)
 * @param adminPublicKey - The admin's public key
 * @returns Result object with the unsigned transaction for frontend signing
 */
  export const distributeTournamentRevenueService = async (
    tournamentId: string,
    prizePercentage: number = DEFAULT_SPLITS.PRIZE_POOL,
    revenuePercentage: number = DEFAULT_SPLITS.REVENUE_POOL,
    stakingPercentage: number = DEFAULT_SPLITS.STAKING_REWARD_POOL,
    burnPercentage: number = DEFAULT_SPLITS.BURN,
    adminPublicKey: PublicKey
  ) => {
    try {
      const { program, connection } = getProgram();
  
      // 1. Verify tournament in Firebase
      console.log("Verifying tournament in Firebase...");
      const tournamentRef = ref(db, `tournaments/${tournamentId}`);
      const tournamentSnapshot = await get(tournamentRef);
      
      if (!tournamentSnapshot.exists()) {
        return {
          success: false,
          message: `Tournament with ID ${tournamentId} not found in database`
        };
      }
      
      const tournament = tournamentSnapshot.val();
      
      if (tournament.status !== "Active" && tournament.status !== "Ended") {
        return {
          success: false,
          message: `Tournament cannot be distributed because it is in '${tournament.status}' status`
        };
      }
  
      if (tournament.distributionCompleted) {
        return {
          success: false,
          message: "Tournament revenue has already been distributed"
        };
      }
  
      // 2. Derive all necessary PDAs
      console.log("Deriving program addresses...");
      const tournamentIdBytes = Buffer.from(tournamentId, "utf8");
  
      // Tournament Pool PDA
      const [tournamentPoolPublicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from("tournament_pool"), adminPublicKey.toBuffer(), tournamentIdBytes],
        program.programId
      );
      console.log("🔹 Tournament Pool PDA:", tournamentPoolPublicKey.toString());
  
      // Prize Pool PDA (derived from tournament pool)
      const [prizePoolPublicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_pool"), tournamentPoolPublicKey.toBuffer()],
        program.programId
      );
      console.log("🔹 Prize Pool PDA:", prizePoolPublicKey.toString());
  
      // Revenue Pool PDA
      const [revenuePoolPublicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from("revenue_pool"), adminPublicKey.toBuffer()],
        program.programId
      );
      console.log("🔹 Revenue Pool PDA:", revenuePoolPublicKey.toString());
  
      // Staking Pool PDA (required by distributeTournamentRevenue)
      const [stakingPoolPublicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from("staking_pool"), adminPublicKey.toBuffer()],
        program.programId
      );
      console.log("🔹 Staking Pool PDA:", stakingPoolPublicKey.toString());

      // Reward Pool PDA
    const [rewardPoolPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_pool"), adminPublicKey.toBuffer()],
      program.programId
    );
    console.log("🔹 Reward Pool PDA:", rewardPoolPublicKey.toString());
  
      // 3. Derive escrow accounts
      const [tournamentEscrowPublicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), tournamentPoolPublicKey.toBuffer()],
        program.programId
      );
      console.log("🔹 Tournament Escrow PDA:", tournamentEscrowPublicKey.toString());
  
      const [prizeEscrowPublicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from("prize_escrow"), prizePoolPublicKey.toBuffer()],
        program.programId
      );
      console.log("🔹 Prize Escrow PDA:", prizeEscrowPublicKey.toString());
  
      const [revenueEscrowPublicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from("revenue_escrow"), revenuePoolPublicKey.toBuffer()],
        program.programId
      );
      console.log("🔹 Revenue Escrow PDA:", revenueEscrowPublicKey.toString());
  
      const [rewardEscrowPublicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from("reward_escrow"), rewardPoolPublicKey.toBuffer()],
        program.programId
      );
      console.log("🔹 Reward Escrow PDA:", rewardEscrowPublicKey.toString());
      
      // 4. Fetch tournament data
      console.log("Fetching tournament data from blockchain...");
      try {
        const tournamentPoolResult = await getTournamentPool(tournamentId, adminPublicKey);
        
        if (!tournamentPoolResult.success) {
          return {
            success: false,
            message: `Failed to fetch tournament data: ${tournamentPoolResult.message || "Unknown error"}`
          };
        }
        
        const tournamentPoolData = tournamentPoolResult.data;
        const mintPublicKey = new PublicKey(tournamentPoolData.mint);
        const totalFunds = Number(tournamentPoolData.totalFunds);
        
        console.log("🔹 Token Mint:", mintPublicKey.toString());
        console.log("🔹 Total Tournament Funds:", totalFunds);
        
        if (totalFunds <= 0) {
          return {
            success: false,
            message: "Tournament has no funds to distribute"
          };
        }
  
        // 5. Create transaction with compute budget optimization
        console.log("Creating optimized distribution transaction...");
        
        // Add compute budget instruction to handle complex operations
        const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
          units: 400_000, // Increased compute units
        });
  
        const distributionInstruction = await program.methods
          .distributeTournamentRevenue(
            tournamentId,
            prizePercentage,
            revenuePercentage,
            stakingPercentage,
            burnPercentage
          )
          .accounts({
            admin: adminPublicKey,
            tournamentPool: tournamentPoolPublicKey,
            prizePool: prizePoolPublicKey,
            revenuePool: revenuePoolPublicKey,
            stakingPool: stakingPoolPublicKey,
            rewardPool: rewardPoolPublicKey,
            tournamentEscrowAccount: tournamentEscrowPublicKey,
            prizeEscrowAccount: prizeEscrowPublicKey,
            revenueEscrowAccount: revenueEscrowPublicKey,
            rewardEscrowAccount: rewardEscrowPublicKey,
            mint: mintPublicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          })
          .instruction();
  
        // Create transaction with both instructions
        const transaction = new Transaction()
          .add(computeBudgetInstruction)
          .add(distributionInstruction);
  
        // Set transaction metadata
        const { blockhash } = await connection.getLatestBlockhash("finalized");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = adminPublicKey;
  
        // Calculate distribution amounts
        const prizeAmount = Math.floor((totalFunds * prizePercentage) / 100);
        const revenueAmount = Math.floor((totalFunds * revenuePercentage) / 100);
        const stakingAmount = Math.floor((totalFunds * stakingPercentage) / 100);
        const burnAmount = Math.floor((totalFunds * burnPercentage) / 100);
  
        return {
          success: true,
          message: "Tournament revenue distribution transaction created successfully!",
          tournamentId,
          transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
          distribution: {
            totalFunds,
            prizeAmount,
            revenueAmount,
            stakingAmount,
            burnAmount
          },
          tournamentRef: tournamentRef.toString(),
          status: "Pending Signature"
        };
      } catch (err) {
        console.error("❌ Error preparing distribution transaction:", err);
        return {
          success: false,
          message: `Error preparing distribution transaction: ${err.message || err}`
        };
      }
    } catch (err) {
      console.error("❌ Error distributing tournament revenue:", err);
      return {
        success: false,
        message: `Error distributing tournament revenue: ${err.message || err}`
      };
    }
  };





/**
 * Prepares an unsigned transaction to distribute prizes to tournament winners
 * @param tournamentId - The ID of the tournament
 * @param firstPlacePublicKey - Public key of the first place winner
 * @param secondPlacePublicKey - Public key of the second place winner
 * @param thirdPlacePublicKey - Public key of the third place winner
 * @param adminPublicKey - The admin's public key who will sign the transaction
 * @returns Result object with unsigned transaction for frontend signing
 */
export const distributeTournamentPrizesService = async (
  tournamentId: string,
  firstPlacePublicKey: PublicKey,
  secondPlacePublicKey: PublicKey,
  thirdPlacePublicKey: PublicKey,
  adminPublicKey: PublicKey
) => {
  try {
    const { program, connection } = getProgram();

    console.log("Preparing prize distribution for tournament:", tournamentId);
    console.log("Winners:");
    console.log("1st Place:", firstPlacePublicKey.toString());
    console.log("2nd Place:", secondPlacePublicKey.toString());
    console.log("3rd Place:", thirdPlacePublicKey.toString());

    // Get tournament data
    const tournamentPoolResult = await getTournamentPool(tournamentId, adminPublicKey);
    if (!tournamentPoolResult.success) {
      return {
        success: false,
        message: `Failed to fetch tournament data: ${tournamentPoolResult.message || "Unknown error"}`
      };
    }

    // 1. First, check if tournament exists and has been distributed in Firebase
    console.log("Verifying tournament in Firebase...");
    const tournamentRef = ref(db, `tournaments/${tournamentId}`);
    const tournamentSnapshot = await get(tournamentRef);
    
    if (!tournamentSnapshot.exists()) {
      return {
        success: false,
        message: `Tournament with ID ${tournamentId} not found in database`
      };
    }
    
    const tournament = tournamentSnapshot.val();
    
    // Check if prizes have already been distributed
    if (tournament.prizesDistributed) {
      return {
        success: false,
        message: "Tournament prizes have already been distributed"
      };
    }

    // Check if the tournament revenue has been distributed (required before prize distribution)
    if (!tournament.distributionCompleted) {
      return {
        success: false,
        message: "Tournament revenue must be distributed before prizes can be distributed"
      };
    }

    // 2. Derive all the necessary PDAs
    console.log("Deriving program addresses...");
    const tournamentIdBytes = Buffer.from(tournamentId, "utf8");

    // Tournament Pool PDA
    const [tournamentPoolPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("tournament_pool"), adminPublicKey.toBuffer(), tournamentIdBytes],
      program.programId
    );
    console.log("🔹 Tournament Pool PDA:", tournamentPoolPublicKey.toString());

    // Prize Pool PDA (derived from tournament pool)
    const [prizePoolPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("prize_pool"), tournamentPoolPublicKey.toBuffer()],
      program.programId
    );
    console.log("🔹 Prize Pool PDA:", prizePoolPublicKey.toString());

    // Prize Escrow PDA
    const [prizeEscrowPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("prize_escrow"), prizePoolPublicKey.toBuffer()],
      program.programId
    );
    console.log("🔹 Prize Escrow PDA:", prizeEscrowPublicKey.toString());

    // 3. Get the mint address from the tournament data
    const mintPublicKey = new PublicKey(tournamentPoolResult.data.mint);
    console.log("🔹 Token Mint:", mintPublicKey.toString());

    // 4. Get token accounts for the winners
    console.log("Getting associated token accounts for winners...");

    // First place token account
    const firstPlaceTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintPublicKey,
      firstPlacePublicKey
    );
    console.log("1st Place Token Account:", firstPlaceTokenAccount.toString());

    // Second place token account
    const secondPlaceTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintPublicKey,
      secondPlacePublicKey
    );
    console.log("2nd Place Token Account:", secondPlaceTokenAccount.toString());

    // Third place token account
    const thirdPlaceTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintPublicKey,
      thirdPlacePublicKey
    );
    console.log("3rd Place Token Account:", thirdPlaceTokenAccount.toString());

    // 5. Create the transaction (but don't sign it)
    console.log("Creating unsigned prize distribution transaction...");
    const transaction = await program.methods
      .distributeTournamentPrizes(tournamentId)
      .accounts({
        admin: adminPublicKey,
        tournamentPool: tournamentPoolPublicKey,
        prizePool: prizePoolPublicKey,
        prizeEscrowAccount: prizeEscrowPublicKey,
        firstPlaceTokenAccount: firstPlaceTokenAccount,
        secondPlaceTokenAccount: secondPlaceTokenAccount,
        thirdPlaceTokenAccount: thirdPlaceTokenAccount,
        mint: mintPublicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    // 6. Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminPublicKey;


    // 8. Calculate prize amounts (if needed for frontend display)
    // You can calculate these based on your distribution logic
    const distributionDetails = tournament.distributionDetails || {};
    const totalPrizeAmount = distributionDetails.prizeAmount || 0;
    
    // Example split: 50% for 1st, 30% for 2nd, 20% for 3rd
    const firstPlaceAmount = Math.floor(totalPrizeAmount * 0.5);
    const secondPlaceAmount = Math.floor(totalPrizeAmount * 0.3);
    const thirdPlaceAmount = Math.floor(totalPrizeAmount * 0.2);

    // 9. Return the unsigned transaction and metadata for frontend
    return {
      success: true,
      message: "Prize distribution transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      winnerData: {
        firstPlace: {
          publicKey: firstPlacePublicKey.toString(),
          tokenAccount: firstPlaceTokenAccount.toString(),
          amount: firstPlaceAmount
        },
        secondPlace: {
          publicKey: secondPlacePublicKey.toString(),
          tokenAccount: secondPlaceTokenAccount.toString(),
          amount: secondPlaceAmount
        },
        thirdPlace: {
          publicKey: thirdPlacePublicKey.toString(),
          tokenAccount: thirdPlaceTokenAccount.toString(),
          amount: thirdPlaceAmount
        }
      },
      status: "Pending Signature"
    };

  } catch (err) {
    console.error("❌ Error preparing tournament prize distribution:", err);
    return {
      success: false,
      message: `Error preparing tournament prize distribution: ${err.message || err}`
    };
  }
};

// Helper function to get or create an associated token account
async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  try {
    // Use getAssociatedTokenAddressSync from @solana/spl-token
    const associatedTokenAddress = getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      TOKEN_2022_PROGRAM_ID  // Use TOKEN_2022_PROGRAM_ID as we're working with token-2022
    );

    console.log(`Token address for ${owner.toString()}: ${associatedTokenAddress.toString()}`);

    // Check if the account exists
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
    
    if (!accountInfo) {
      console.log(`Token account for ${owner.toString()} does not exist. It will be created during the transaction.`);
    } else {
      console.log(`Token account for ${owner.toString()} exists with ${accountInfo.lamports} lamports`);
    }

    return associatedTokenAddress;
  } catch (err) {
    console.error("Error in getOrCreateAssociatedTokenAccount:", err);
    throw err;
  }
}