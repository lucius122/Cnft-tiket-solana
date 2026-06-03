/**
 * umi.ts — Setup instance Umi untuk frontend
 *
 * KONSEP: Apa itu Umi?
 * ====================
 * Umi adalah framework dari Metaplex untuk berinteraksi dengan Solana.
 * Bayangkan seperti "penerjemah" antara kode JavaScript kamu dan blockchain Solana.
 *
 * Kenapa pakai Umi dan bukan @solana/web3.js langsung?
 * - @solana/web3.js = low-level, seperti menulis SQL langsung
 * - Umi = high-level, seperti pakai ORM (Prisma/Eloquent)
 *
 * Umi menyederhanakan banyak hal:
 * - Serialization/deserialization data
 * - Signing transaksi
 * - Interaksi dengan program Metaplex (Bubblegum, Token Metadata, dll)
 *
 * Di frontend, Umi dikombinasikan dengan wallet adapter:
 * - User connect Phantom wallet → Umi pakai wallet itu untuk sign transaksi
 * - User tidak perlu input private key (Phantom yang handle)
 */

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";

/**
 * Buat instance Umi yang terkoneksi ke Solana Devnet
 * Instance ini belum punya signer (wallet) — nanti ditambahkan saat mint
 */
export function createUmiInstance() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

  const umi = createUmi(rpcUrl).use(mplBubblegum());

  return umi;
}
