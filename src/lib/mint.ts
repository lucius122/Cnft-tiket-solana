/**
 * mint.ts — Logic untuk minting cNFT tiket konser
 *
 * KONSEP: Bagaimana minting cNFT bekerja?
 * ========================================
 * 1. User klik "Mint Tiket" di browser
 * 2. Frontend menyiapkan data tiket (nama, gambar, atribut)
 * 3. Frontend membuat transaksi `mintV1` via Umi + Bubblegum
 * 4. Phantom wallet muncul → user approve transaksi
 * 5. Transaksi dikirim ke Solana Devnet
 * 6. Solana memproses: data tiket di-hash dan disimpan di Merkle Tree
 * 7. cNFT "muncul" di wallet user (bisa dicek di Phantom / Explorer)
 *
 * Biaya: ~0.00001 SOL per mint (praktis gratis di Devnet)
 *
 * PENTING: Di versi demo ini, metadata (gambar + atribut) di-hardcode.
 * Di Fase 2, kita akan upload metadata ke storage (Irys/Arweave).
 */

import { mintV1 } from "@metaplex-foundation/mpl-bubblegum";
import { none, publicKey, transactionBuilder, sol } from "@metaplex-foundation/umi";
import type { Option, Umi } from "@metaplex-foundation/umi";
import type { Collection } from "@metaplex-foundation/mpl-bubblegum";
import { transferSol } from "@metaplex-foundation/mpl-toolbox";
import bs58 from "bs58";

/**
 * Metadata untuk tiket demo
 * Di production, ini akan di-upload ke Arweave/IPFS sebagai JSON
 * Untuk demo, kita hardcode URI-nya
 */
const DEMO_TICKET_METADATA = {
  name: "🎫 Demo Tiket — Coldplay Jakarta 2026",
  symbol: "TIKET",
  // URI mengarah ke metadata JSON yang mendeskripsikan tiket
  // Untuk demo, kita pakai placeholder — nanti diganti di Fase 2
  uri: "https://raw.githubusercontent.com/solana-developers/program-examples/main/tokens/tokens/compressed-nfts/uri.json",
  sellerFeeBasisPoints: 500, // 5% royalty
  collection: none<Collection>(), // Belum pakai collection — ditambahkan di Fase 2
  creators: [] as { address: ReturnType<typeof publicKey>; verified: boolean; share: number }[],
};

export interface MintResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Mint 1 cNFT demo ke wallet user beserta pembayaran (Solana Pay)
 *
 * @param umi - Instance Umi yang sudah terkoneksi + ada signer (wallet user)
 * @param ownerAddress - Public key penerima cNFT (biasanya = wallet user)
 * @param priceLamports - Jumlah harga tiket dalam satuan Lamports (1 SOL = 10^9 Lamports)
 * @returns MintResult dengan signature transaksi atau error
 */
export async function mintDemoTicket(
  umi: Umi,
  ownerAddress: string,
  priceLamports: number = 0
): Promise<MintResult> {
  // Ambil tree address dari environment variable
  const treeAddress = process.env.NEXT_PUBLIC_TREE_ADDRESS;
  const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET || "H29eqrYPizjEThhpNEp7xMNGt3EoMXwQbLsU2xSTq3Jd"; // Fallback wallet

  if (!treeAddress) {
    return {
      success: false,
      error:
        "Tree address belum diset! Jalankan dulu: npx tsx scripts/create-tree.ts",
    };
  }

  try {
    console.log("🎫 Mulai memproses transaksi tiket...");
    console.log(`   Pembeli: ${ownerAddress}`);
    console.log(`   Admin: ${adminWallet}`);
    console.log(`   Harga: ${priceLamports} Lamports`);

    // Siapkan metadata dengan creator = identity (wallet user yang connect)
    const metadata = {
      ...DEMO_TICKET_METADATA,
      creators: [
        {
          address: umi.identity.publicKey,
          verified: false,
          share: 100,
        },
      ],
    };

    // Buat Transaction Builder
    let builder = transactionBuilder();

    // 1. Tambahkan instruksi pembayaran jika harga > 0
    if (priceLamports > 0) {
      builder = builder.add(
        transferSol(umi, {
          source: umi.identity,
          destination: publicKey(adminWallet),
          amount: sol(priceLamports / 1_000_000_000),
        })
      );
    }

    // 2. Tambahkan instruksi mint cNFT
    builder = builder.add(
      mintV1(umi, {
        leafOwner: publicKey(ownerAddress),
        merkleTree: publicKey(treeAddress),
        metadata,
      })
    );

    // Kirim gabungan transaksi (Payment + Mint)
    const result = await builder.sendAndConfirm(umi);

    // Konversi signature ke base58 string untuk ditampilkan
    const signatureBytes = result.signature;
    const signatureBase58 = bs58.encode(signatureBytes);

    console.log("✅ Pembayaran dan cNFT berhasil diproses!");
    console.log(`   Signature: ${signatureBase58.slice(0, 30)}...`);
    console.log(
      `   🔗 Explorer: https://explorer.solana.com/tx/${signatureBase58}?cluster=devnet`
    );

    return {
      success: true,
      signature: signatureBase58,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error("❌ Transaksi gagal:", errorMessage);

    // Berikan pesan error yang user-friendly
    let userMessage = errorMessage;

    if (errorMessage.includes("insufficient")) {
      userMessage =
        "Saldo SOL tidak cukup untuk membayar tiket dan biaya transaksi. Isi saldo di faucet.solana.com";
    } else if (
      errorMessage.includes("429") ||
      errorMessage.includes("rate")
    ) {
      userMessage =
        "Server Solana sedang sibuk. Tunggu 30 detik lalu coba lagi.";
    } else if (errorMessage.includes("User rejected")) {
      userMessage = "Transaksi dibatalkan oleh Anda di dompet Phantom.";
    } else if (errorMessage.includes("not connected")) {
      userMessage = "Wallet belum terconnect. Klik Connect Wallet dulu.";
    }

    return {
      success: false,
      error: userMessage,
    };
  }
}
