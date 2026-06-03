"use client";

/**
 * WalletProvider.tsx — Komponen wrapper untuk koneksi wallet Solana
 *
 * KONSEP: Kenapa butuh "Provider"?
 * Di React, Provider adalah pattern untuk berbagi data ke semua komponen.
 * Wallet Provider memungkinkan SEMUA halaman di app kita untuk:
 * 1. Tahu apakah user sudah connect wallet
 * 2. Akses alamat wallet user
 * 3. Kirim transaksi atas nama user (dengan persetujuan mereka)
 *
 * Tanpa Provider ini, setiap komponen harus setup koneksi sendiri — tidak efisien.
 *
 * KONSEP: ConnectionProvider vs WalletProvider
 * - ConnectionProvider: koneksi ke jaringan Solana (Devnet/Mainnet)
 * - WalletProvider: manajemen wallet (Phantom, Solflare, dll)
 * Keduanya harus membungkus app kita.
 */

import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import CSS bawaan untuk modal wallet (tombol connect, dll)
import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: ReactNode;
}

export default function WalletProvider({ children }: Props) {
  // Tentukan RPC endpoint dari environment variable
  // Fallback ke devnet kalau env tidak diset
  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet"),
    []
  );

  // Daftar wallet yang didukung
  // Untuk demo, kita support Phantom saja (paling populer)
  // useMemo supaya tidak re-create adapter setiap render
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    // Layer 1: Koneksi ke jaringan Solana
    <ConnectionProvider endpoint={endpoint}>
      {/* Layer 2: Manajemen wallet */}
      <SolanaWalletProvider wallets={wallets} autoConnect>
        {/* Layer 3: UI modal untuk pilih/connect wallet */}
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
