"use client";

/**
 * Mint Page — Halaman untuk mint cNFT demo tiket konser
 *
 * Flow:
 * 1. User harus connect wallet dulu (cek via useWallet hook)
 * 2. Klik tombol "Mint Tiket Demo"
 * 3. Umi membuat transaksi mintV1 → Phantom minta approval
 * 4. Setelah berhasil, tampilkan link ke Solana Explorer
 * 5. User bisa cek cNFT di Phantom wallet (tab NFTs, network: Devnet)
 */

import { useState, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import Link from "next/link";
import WalletButton from "@/components/WalletButton";
import { createUmiInstance } from "@/lib/umi";
import { mintDemoTicket, type MintResult } from "@/lib/mint";

export default function MintPage() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [minting, setMinting] = useState(false);
  const [result, setResult] = useState<MintResult | null>(null);

  // Setup Umi instance dengan wallet adapter sebagai signer
  // useMemo agar tidak re-create setiap render
  const umi = useMemo(() => {
    const instance = createUmiInstance();
    if (wallet) {
      // walletAdapterIdentity = jembatan antara Phantom wallet dan Umi
      // Saat Umi butuh sign transaksi, dia akan "minta" ke Phantom
      return instance.use(walletAdapterIdentity(wallet));
    }
    return instance;
  }, [wallet]);

  const handleMint = async () => {
    if (!wallet.publicKey) {
      setResult({
        success: false,
        error: "Connect wallet dulu sebelum mint!",
      });
      return;
    }

    setMinting(true);
    setResult(null);

    try {
      const mintResult = await mintDemoTicket(
        umi,
        wallet.publicKey.toBase58()
      );
      setResult(mintResult);
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi error yang tidak diketahui",
      });
    } finally {
      setMinting(false);
    }
  };

  const treeAddress = process.env.NEXT_PUBLIC_TREE_ADDRESS;

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-icon">🎫</span>
          TiketKonser
        </Link>
        <WalletButton />
      </nav>

      {/* MINT CONTAINER */}
      <div className="mint-container">
        <div className="card-glass mint-card">
          {/* Header */}
          <div className="mint-header">
            <h1>Mint Demo Tiket</h1>
            <p>Mint 1 cNFT tiket konser ke wallet kamu (Devnet)</p>
          </div>

          {/* Preview tiket */}
          <div className="mint-preview">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                padding: "2rem",
              }}
            >
              <span style={{ fontSize: "4rem" }}>🎫</span>
              <div style={{ textAlign: "center" }}>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    marginBottom: "0.25rem",
                  }}
                >
                  Coldplay Jakarta 2026
                </h3>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Demo Ticket · Solana Devnet
                </p>
              </div>
            </div>
          </div>

          {/* Detail tiket */}
          <div className="mint-details">
            <div className="mint-detail-row">
              <span className="mint-detail-label">Network</span>
              <span className="mint-detail-value">Solana Devnet</span>
            </div>
            <div className="mint-detail-row">
              <span className="mint-detail-label">Type</span>
              <span className="mint-detail-value">
                Compressed NFT (cNFT)
              </span>
            </div>
            <div className="mint-detail-row">
              <span className="mint-detail-label">Biaya Mint</span>
              <span
                className="mint-detail-value"
                style={{ color: "var(--success)" }}
              >
                ~0.00001 SOL (gratis)
              </span>
            </div>
            <div className="mint-detail-row">
              <span className="mint-detail-label">Merkle Tree</span>
              <span className="mint-detail-value">
                {treeAddress
                  ? `${treeAddress.slice(0, 6)}...${treeAddress.slice(-4)}`
                  : "⚠️ Belum diset"}
              </span>
            </div>
          </div>

          {/* Tombol Mint / Status */}
          {!wallet.connected ? (
            <div className="mint-status mint-status-error">
              ⚠️ Connect wallet dulu untuk mint tiket
            </div>
          ) : !treeAddress ? (
            <div className="mint-status mint-status-error">
              ⚠️ Merkle Tree belum dibuat. Jalankan:{" "}
              <code>npx tsx scripts/create-tree.ts</code>
            </div>
          ) : (
            <button
              id="mint-ticket-btn"
              onClick={handleMint}
              disabled={minting}
              className={`btn btn-accent ${minting ? "btn-loading" : ""}`}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {minting ? (
                "Minting... (approve di Phantom)"
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  Mint 1 Tiket Demo
                </>
              )}
            </button>
          )}

          {/* Result */}
          {result && (
            <div
              className={`mint-status ${
                result.success ? "mint-status-success" : "mint-status-error"
              }`}
            >
              {result.success ? (
                <>
                  ✅ Berhasil! cNFT sudah di-mint ke wallet kamu.
                  <br />
                  <small>
                    Cek di Phantom wallet (tab NFTs, network: Devnet)
                  </small>
                  {result.signature && (
                    <>
                      <br />
                      <a
                        href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Lihat di Solana Explorer →
                      </a>
                    </>
                  )}
                </>
              ) : (
                <>❌ {result.error}</>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer" style={{ marginTop: "auto" }}>
        <p>
          <Link href="/">← Kembali ke Home</Link>
        </p>
      </footer>
    </>
  );
}
