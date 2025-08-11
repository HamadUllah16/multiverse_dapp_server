
//src/adminDashboard/services.ts

import {
    PublicKey,
    SystemProgram,
  } from "@solana/web3.js";
  import {
    TOKEN_2022_PROGRAM_ID,
  } from "@solana/spl-token";
  import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
  import dotenv from "dotenv";
  import { getProgram } from "../staking/services";
  dotenv.config();
  import * as anchor from "@project-serum/anchor";
  import { RevenuePoolAccount } from "./dashboardStatsService";
  
  export interface StakingPoolAccount {
      admin: PublicKey;
      mint: PublicKey;
      totalStaked: anchor.BN;
      bump: number;
  }

  export interface RewardPoolAccount {
    admin: PublicKey;
    mint: PublicKey;
    totalFunds: anchor.BN;
    lastDistribution: anchor.BN;
    bump: number;
  }
  
  // ✅ Function to initialize the staking pool and escrow account
  export const initializeStakingPoolService = async (mintPublicKey: PublicKey, adminPublicKey: PublicKey) => {
      try {
          const { program, connection } = getProgram();
  
          // ✅ Staking pool doesn't exist - create initialization transaction
          console.log("🔄 Creating staking pool initialization transaction...");
          
          console.log("Admin PublicKey:", adminPublicKey.toBase58());
  
          const [stakingPoolPublicKey] = PublicKey.findProgramAddressSync(
              [Buffer.from("staking_pool"), adminPublicKey.toBuffer()],
              program.programId
          );
  
          const [poolEscrowAccountPublicKey] = PublicKey.findProgramAddressSync(
              [Buffer.from("escrow"), stakingPoolPublicKey.toBuffer()],
              program.programId
          );
  
          console.log("🔹 Staking Pool PDA Address:", stakingPoolPublicKey.toString());
          console.log("🔹 Pool Escrow Account Address:", poolEscrowAccountPublicKey.toString());
  
  
  
  
          
          // Get the latest blockhash
          const { blockhash } = await connection.getLatestBlockhash("finalized");
          console.log("Latest Blockhash:", blockhash);
  
          // Create the transaction
          const transaction = await program.methods
              .initializeAccounts()
              .accounts({
                  admin: adminPublicKey,
                  stakingPool: stakingPoolPublicKey,
                  mint: mintPublicKey,
                  poolEscrowAccount: poolEscrowAccountPublicKey,
                  systemProgram: SystemProgram.programId,
                  tokenProgram: TOKEN_2022_PROGRAM_ID,
              })
              .transaction();
  
          // Set recent blockhash and fee payer
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = adminPublicKey;
  
          // Serialize transaction and send it to the frontend
          return {
              success: true,
              message: "Transaction created successfully!",
              stakingPoolPublicKey: stakingPoolPublicKey.toBase58(),
              poolEscrowAccountPublicKey: poolEscrowAccountPublicKey.toBase58(),
              transaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
          };
      } catch (err) {
          console.error("❌ Error initializing staking pool:", err);
          return {
              success: false,
              message: `Error initializing staking pool: ${err.message || err}`
          };
      }
  };
  
  /**
   * Initialize the global revenue pool
   * @param mintPublicKey - The token mint address
   * @returns Result object with transaction details and addresses
   */
  export const initializeRevenuePoolService = async (mintPublicKey: PublicKey, adminPublicKey: PublicKey) => {
      try {
          const { program, connection } = getProgram();
  
          // Log initial parameters for clarity
          console.log("Initializing Revenue Pool:");
          console.log("Admin PublicKey:", adminPublicKey.toBase58());
          console.log("Mint PublicKey:", mintPublicKey.toBase58());
  
          // Derive the PDA for the revenue pool
          const [revenuePoolPublicKey] = PublicKey.findProgramAddressSync(
              [Buffer.from("revenue_pool"), adminPublicKey.toBuffer()],
              program.programId
          );
  
          // Derive the PDA for the revenue escrow account
          const [revenueEscrowPublicKey] = PublicKey.findProgramAddressSync(
              [Buffer.from("revenue_escrow"), revenuePoolPublicKey.toBuffer()],
              program.programId
          );
  
          console.log("🔹 Revenue Pool PDA Address:", revenuePoolPublicKey.toString());
          console.log("🔹 Revenue Escrow PDA Address:", revenueEscrowPublicKey.toString());
  
          // Get the latest blockhash
          const { blockhash } = await connection.getLatestBlockhash("finalized");
          console.log("Latest Blockhash:", blockhash);
  
          // Create the transaction
          const transaction = await program.methods
              .initializeRevenuePool()
              .accounts({
                  revenuePool: revenuePoolPublicKey,
                  revenueEscrowAccount: revenueEscrowPublicKey,
                  mint: mintPublicKey,
                  admin: adminPublicKey,
                  systemProgram: anchor.web3.SystemProgram.programId,
                  tokenProgram: TOKEN_2022_PROGRAM_ID,
              })
              .transaction();
  
          // Set recent blockhash and fee payer
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = adminPublicKey;
  
          // Serialize transaction and send it to the frontend
          return {
              success: true,
              message: "Transaction created successfully!",
              transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
          };
      } catch (err) {
          console.error("❌ Error initializing revenue pool:", err);
          return {
              success: false,
              message: `Error initializing revenue pool: ${err.message || err}`
          };
      }
  };


  // ✅ Initialize Reward Pool (admin-only)
export const initializeRewardPoolService = async (
  mintPublicKey: PublicKey,
  adminPublicKey: PublicKey
) => {
  try {
    const { program, connection } = getProgram();

    // Derive PDAs
    const [rewardPoolPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_pool"), adminPublicKey.toBuffer()],
      program.programId
    );

    const [rewardEscrowPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_escrow"), rewardPoolPublicKey.toBuffer()],
      program.programId
    );

    // Build unsigned tx
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    const transaction = await program.methods
      .initializeRewardPool()
      .accounts({
        rewardPool: rewardPoolPublicKey,
        rewardEscrowAccount: rewardEscrowPublicKey,
        mint: mintPublicKey,
        admin: adminPublicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction();

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminPublicKey;

    return {
      success: true,
      message: "Transaction created successfully!",
      rewardPool: rewardPoolPublicKey.toBase58(),
      rewardEscrow: rewardEscrowPublicKey.toBase58(),
      transaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
    };
  } catch (err: any) {
    console.error("❌ Error creating initializeRewardPool tx:", err);
    return { success: false, message: `Error creating tx: ${err.message || err}` };
  }
};

  
  // ✅ Function to check pool status for staking, revenue, and prize pools
  export const checkPoolStatus = async (adminPublicKey: PublicKey, tournamentId?: string) => {
      try {
          const { program } = getProgram();
  
          const result = {
              success: true,
              stakingPool: {
                  status: false, // false = needs initialization, true = exists
              },
              revenuePool: {
                  status: false, // false = needs initialization, true = exists
              },
              rewardPool: {
                status: false, // false = needs initialization, true = exists
            },
              adminAddress: adminPublicKey.toString()
          };
  
          // ✅ 1. Check Staking Pool
          const [stakingPoolPublicKey] = PublicKey.findProgramAddressSync(
              [Buffer.from("staking_pool"), adminPublicKey.toBuffer()],
              program.programId
          );
  
          const [stakingEscrowAccountPublicKey] = PublicKey.findProgramAddressSync(
              [Buffer.from("escrow"), stakingPoolPublicKey.toBuffer()],
              program.programId
          );
  
          console.log("🔹 Checking Staking Pool PDA:", stakingPoolPublicKey.toString());
  
          const stakingPoolAccount = await program.account.stakingPool.fetchNullable(stakingPoolPublicKey) as StakingPoolAccount;
  
          result.stakingPool = {
              status: stakingPoolAccount !== null,
          };
  
          // ✅ 2. Check Revenue Pool
          const [revenuePoolPublicKey] = PublicKey.findProgramAddressSync(
              [Buffer.from("revenue_pool"), adminPublicKey.toBuffer()],
              program.programId
          );
  
          const [revenueEscrowAccountPublicKey] = PublicKey.findProgramAddressSync(
              [Buffer.from("revenue_escrow"), revenuePoolPublicKey.toBuffer()],
              program.programId
          );
  
          console.log("🔹 Checking Revenue Pool PDA:", revenuePoolPublicKey.toString());
  
          const revenuePoolAccount = await program.account.revenuePool.fetchNullable(revenuePoolPublicKey) as RevenuePoolAccount;
  
          result.revenuePool = {
              status: revenuePoolAccount !== null,
          }

 
          // ✅ 3. Check Reward Pool
          const [rewardPoolPublicKey] = PublicKey.findProgramAddressSync(
            [Buffer.from("reward_pool"), adminPublicKey.toBuffer()],
            program.programId
        );

        const [rewardEscrowAccountPublicKey] = PublicKey.findProgramAddressSync(
            [Buffer.from("reward_escrow"), rewardPoolPublicKey.toBuffer()],
            program.programId
        );

        console.log("🔹 Checking Reward Pool PDA:", rewardPoolPublicKey.toString());

        const rewardPoolAccount = await program.account.rewardPool.fetchNullable(rewardPoolPublicKey) as RewardPoolAccount;

        result.rewardPool = {
            status: rewardPoolAccount !== null,
        }
  
          return result;
  
      } catch (err) {
          console.error("❌ Error checking pool status:", err);
          return {
              success: false,
              message: `Error checking pool status: ${err.message || err}`
          };
      }
  };