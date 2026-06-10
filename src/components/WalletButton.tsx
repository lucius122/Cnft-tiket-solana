"use client";

/**
 * WalletButton.tsx — Tombol connect/disconnect wallet + tampilkan balance
 *
 * Komponen ini menampilkan:
 * 1. Tombol "Connect Wallet" jika belum terconnect
 * 2. Alamat wallet (dipotong agar singkat) + SOL balance jika sudah connect
 * 3. Tombol disconnect
 *
 * KONSEP: Kenapa alamat wallet dipotong?
 * Alamat Solana itu 32-44 karakter (contoh: Eu7DTVtTWedZJKZXha644CfyhMbjAC48Wfc1xuCDs91H)
 * Terlalu panjang untuk UI. Kita tampilkan "Eu7D...s91H" saja — cukup untuk identifikasi.
 */

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState, useCallback } from "react";

export default function WalletButton() {
  const { publicKey, disconnect, connected, wallet, connect } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  // State untuk menyimpan balance SOL
  const [balance, setBalance] = useState<number | null>(null);

  /**
   * Fetch balance SOL dari blockchain
   *
   * KONSEP: Lamports vs SOL
   * Di Solana, unit terkecil bukan SOL tapi "lamport" (seperti "satoshi" di Bitcoin).
   * 1 SOL = 1,000,000,000 lamports (1 miliar)
   * Blockchain menyimpan balance dalam lamports, kita konversi ke SOL untuk tampilan.
   */
  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Gagal fetch balance:", error);
      setBalance(null);
    }
  }, [publicKey, connection]);

  // Fetch balance saat wallet connect/disconnect
  useEffect(() => {
    fetchBalance();
    // Re-fetch setiap 30 detik (agar update setelah transaksi)
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  // Helper: potong alamat wallet jadi singkat
  const truncateAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  // Jika wallet belum terconnect, tampilkan tombol connect
  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => {
          if (wallet) {
            // Jika user sebelumnya sudah memilih wallet tapi pop-up kepencet hilang/dicancel,
            // langsung panggil pop-up nya lagi tanpa buka modal
            connect().catch((error) => console.log("Gagal connect:", error));
          } else {
            // Jika belum ada wallet yang dipilih sama sekali, buka modal
            setVisible(true);
          }
        }}
        className="wallet-btn wallet-btn-connect"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
        Connect Wallet
      </button>
    );
  }

  // Wallet sudah terconnect — tampilkan info
  return (
    <div className="wallet-info">
      <div className="wallet-info-details">
        <div className="wallet-address">
          <span className="wallet-dot" />
          {truncateAddress(publicKey.toBase58())}
        </div>
        {balance !== null && (
          <div className="wallet-balance">
            {balance.toFixed(4)} SOL
          </div>
        )}
      </div>
      <button
        onClick={() => disconnect()}
        className="wallet-btn wallet-btn-disconnect"
        title="Disconnect wallet"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}
