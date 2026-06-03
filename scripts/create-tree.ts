/**
 * create-tree.ts — Script untuk membuat Merkle Tree di Solana Devnet
 *
 * JALANKAN SEKALI SAJA! Output-nya disimpan di .env.local
 *
 * KONSEP: Apa itu Merkle Tree?
 * =============================
 * Bayangkan kamu punya buku telepon raksasa. Kalau mau cek apakah nomor seseorang
 * ada di buku, kamu harus buka halaman satu per satu — lambat!
 *
 * Merkle Tree adalah cara pintar untuk menyimpan data. Alih-alih menyimpan setiap
 * item satu per satu (mahal di blockchain), data di-hash (dikompres) menjadi
 * "sidik jari" yang ringkas. Hanya sidik jari teratas (root hash) yang disimpan
 * on-chain.
 *
 * Untuk cNFT: alih-alih menyimpan setiap NFT sebagai account terpisah ($2/NFT),
 * kita simpan ribuan NFT dalam satu Merkle Tree (<$0.01/NFT).
 *
 * Parameter penting:
 * - maxDepth: menentukan kapasitas tree (2^maxDepth = max items)
 *   - maxDepth=14 → 16,384 cNFT (cukup untuk demo)
 * - maxBufferSize: berapa banyak update yang bisa diproses bersamaan
 *   - 64 cukup untuk demo
 *
 * CARA PAKAI:
 * npx tsx scripts/create-tree.ts
 */

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createTree } from "@metaplex-foundation/mpl-bubblegum";
import {
  generateSigner,
  keypairIdentity,
} from "@metaplex-foundation/umi";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function main() {
  console.log("🌲 Membuat Merkle Tree di Solana Devnet...\n");

  // 1. Setup Umi instance
  // Umi adalah "Swiss army knife" untuk interaksi dengan Solana dari Metaplex
  // Lebih mudah dari @solana/web3.js untuk operasi NFT/cNFT
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  console.log(`📡 RPC: ${rpcUrl}`);

  const umi = createUmi(rpcUrl).use(mplBubblegum());

  // 2. Load developer keypair
  // Ini keypair yang kamu generate dengan `solana-keygen new`
  // Dipakai untuk sign transaksi (bayar gas fee)
  const keypairPath =
    process.env.KEYPAIR_PATH ||
    path.join(
      process.env.USERPROFILE || process.env.HOME || "",
      ".config",
      "solana",
      "id.json"
    );

  console.log(`🔑 Loading keypair dari: ${keypairPath}`);

  if (!fs.existsSync(keypairPath)) {
    console.error(
      "❌ Keypair tidak ditemukan! Jalankan: solana-keygen new"
    );
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(secretKey)
  );
  umi.use(keypairIdentity(keypair));

  console.log(`👤 Developer wallet: ${keypair.publicKey}`);

  // 3. Cek balance
  const balance = await umi.rpc.getBalance(keypair.publicKey);
  const solBalance =
    Number(balance.basisPoints) / 1_000_000_000;
  console.log(`💰 Balance: ${solBalance} SOL`);

  if (solBalance < 0.5) {
    console.error(
      "❌ Balance kurang! Butuh minimal 0.5 SOL."
    );
    console.error(
      "   Jalankan: solana airdrop 2"
    );
    console.error(
      "   Atau request via: https://faucet.solana.com/"
    );
    process.exit(1);
  }

  // 4. Generate signer baru untuk Merkle Tree account
  // Setiap Merkle Tree butuh public key sendiri sebagai identitas
  const merkleTree = generateSigner(umi);

  console.log("\n🔨 Membuat Merkle Tree...");
  console.log(`   Address: ${merkleTree.publicKey}`);
  console.log("   Max Depth: 14 (kapasitas: 16,384 cNFT)");
  console.log("   Max Buffer Size: 64");
  console.log("   Public: true (siapapun bisa mint)\n");

  // 5. Kirim transaksi createTree
  try {
    const builder = await createTree(umi, {
      merkleTree,
      maxDepth: 14,
      maxBufferSize: 64,
      public: true, // Kalau false, hanya creator yang bisa mint
    });

    const result = await builder.sendAndConfirm(umi);

    console.log("✅ Merkle Tree berhasil dibuat!");
    console.log(`   Tree Address: ${merkleTree.publicKey}`);
    console.log(
      `   Tx Signature: ${Buffer.from(result.signature).toString("base64").slice(0, 20)}...`
    );
    console.log(
      `   🔗 Lihat di Explorer: https://explorer.solana.com/address/${merkleTree.publicKey}?cluster=devnet`
    );

    // 6. Simpan tree address ke .env.local
    const envPath = path.resolve(__dirname, "../.env.local");
    let envContent = fs.readFileSync(envPath, "utf-8");

    // Update NEXT_PUBLIC_TREE_ADDRESS
    envContent = envContent.replace(
      /NEXT_PUBLIC_TREE_ADDRESS=.*/,
      `NEXT_PUBLIC_TREE_ADDRESS=${merkleTree.publicKey}`
    );

    fs.writeFileSync(envPath, envContent);

    console.log(`\n📝 Tree address sudah disimpan ke .env.local`);
    console.log(
      "\n🎉 Selesai! Sekarang kamu bisa mint cNFT dari halaman web."
    );
  } catch (error: unknown) {
    console.error("\n❌ Gagal membuat Merkle Tree!");
    if (error instanceof Error) {
      console.error("   Error:", error.message);

      // Common errors dan solusinya
      if (error.message.includes("insufficient")) {
        console.error("\n💡 Solusi: SOL tidak cukup.");
        console.error(
          "   Jalankan: solana airdrop 2"
        );
      } else if (
        error.message.includes("429") ||
        error.message.includes("rate")
      ) {
        console.error(
          "\n💡 Solusi: RPC rate-limited. Tunggu 1 menit lalu coba lagi."
        );
        console.error(
          "   Atau daftar Helius (gratis): https://www.helius.dev/"
        );
      }
    } else {
      console.error("   Error:", error);
    }
    process.exit(1);
  }
}

main();
