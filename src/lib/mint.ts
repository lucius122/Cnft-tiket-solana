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
import { none, publicKey } from "@metaplex-foundation/umi";
import type { Umi } from "@metaplex-foundation/umi";

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
  collection: none(), // Belum pakai collection — ditambahkan di Fase 2
  creators: [] as { address: ReturnType<typeof publicKey>; verified: boolean; share: number }[],
};

export interface MintResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Mint 1 cNFT demo ke wallet user
 *
 * @param umi - Instance Umi yang sudah terkoneksi + ada signer (wallet user)
 * @param ownerAddress - Public key penerima cNFT (biasanya = wallet user)
 * @returns MintResult dengan signature transaksi atau error
 */
export async function mintDemoTicket(
  umi: Umi,
  ownerAddress: string
): Promise<MintResult> {
  // Ambil tree address dari environment variable
  const treeAddress = process.env.NEXT_PUBLIC_TREE_ADDRESS;

  if (!treeAddress) {
    return {
      success: false,
      error:
        "Tree address belum diset! Jalankan dulu: npx tsx scripts/create-tree.ts",
    };
  }

  try {
    console.log("🎫 Mulai minting cNFT...");
    console.log(`   Owner: ${ownerAddress}`);
    console.log(`   Tree: ${treeAddress}`);

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

    // Kirim transaksi mintV1
    // mintV1 = instruksi Bubblegum untuk mencetak 1 cNFT ke Merkle Tree
    const result = await mintV1(umi, {
      leafOwner: publicKey(ownerAddress),
      merkleTree: publicKey(treeAddress),
      metadata,
    }).sendAndConfirm(umi);

    // Konversi signature ke base58 string untuk ditampilkan
    const signatureBytes = result.signature;
    const signatureBase64 = Buffer.from(signatureBytes).toString("base64");

    console.log("✅ cNFT berhasil di-mint!");
    console.log(`   Signature: ${signatureBase64.slice(0, 30)}...`);
    console.log(
      `   🔗 Explorer: https://explorer.solana.com/tx/${signatureBase64}?cluster=devnet`
    );

    return {
      success: true,
      signature: signatureBase64,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error("❌ Minting gagal:", errorMessage);

    // Berikan pesan error yang user-friendly
    let userMessage = errorMessage;

    if (errorMessage.includes("insufficient")) {
      userMessage =
        "SOL tidak cukup untuk membayar biaya transaksi. Request airdrop dulu di faucet.solana.com";
    } else if (
      errorMessage.includes("429") ||
      errorMessage.includes("rate")
    ) {
      userMessage =
        "Server Solana sedang sibuk. Tunggu 30 detik lalu coba lagi.";
    } else if (errorMessage.includes("User rejected")) {
      userMessage = "Transaksi dibatalkan oleh user di wallet.";
    } else if (errorMessage.includes("not connected")) {
      userMessage = "Wallet belum terconnect. Klik Connect Wallet dulu.";
    }

    return {
      success: false,
      error: userMessage,
    };
  }
}
