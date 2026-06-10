/**
 * Halaman Marketplace — Pasar Sekunder Tiket
 *
 * LOGIKA SMART CONTRACT:
 * =======================
 * Saat pembeli klik "Beli Tiket", frontend membangun SATU transaksi Solana
 * yang berisi 3 instruksi transferSol secara ATOMIC:
 *   1. 87% harga → ke Penjual
 *   2. 10% harga → ke Promotor (royalti)
 *   3.  3% harga → ke Platform (komisi)
 *
 * Jika salah satu transfer gagal, SELURUH transaksi dibatalkan (rollback).
 * Ini menjamin tidak ada pihak yang rugi.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import WalletButton from "@/components/WalletButton";
import type { Ticket } from "@/lib/tickets";
import bs58 from "bs58";
import { createUmiInstance } from "@/lib/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

// Bagi hasil resale
const PROMOTER_ROYALTY = 0.10; // 10%
const PLATFORM_COMMISSION = 0.03; // 3%
const SELLER_SHARE = 1 - PROMOTER_ROYALTY - PLATFORM_COMMISSION; // 87%

// Kurs IDR → SOL (demo)
const EXCHANGE_RATE = 2_500_000;

// Platform wallet — menerima komisi 3%
const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || "H29eqrYPizjEThhpNEp7xMNGt3EoMXwQbLsU2xSTq3Jd";

interface MarketplaceTicket extends Ticket {
  originalPrice?: number;
  maxResalePrice?: number;
  promoterWallet?: string | null;
}

export default function MarketplacePage() {
  const wallet = useWallet();
  const [tickets, setTickets] = useState<MarketplaceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingTicketId, setBuyingTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<MarketplaceTicket | null>(null);

  const umi = useMemo(() => {
    const instance = createUmiInstance();
    if (wallet) return instance.use(walletAdapterIdentity(wallet));
    return instance;
  }, [wallet]);

  useEffect(() => {
    fetchListedTickets();
  }, []);

  async function fetchListedTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace");
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  }

  async function handleBuy(ticket: MarketplaceTicket) {
    if (!wallet.connected || !wallet.publicKey) {
      alert("Connect wallet terlebih dahulu!");
      return;
    }

    if (wallet.publicKey.toBase58() === ticket.walletAddress) {
      alert("Ini adalah tiket Anda sendiri!");
      return;
    }

    if (!ticket.resalePrice) return;

    setSelectedTicket(null); // Close modal if open
    setBuyingTicketId(ticket.id);

    try {
      const { transactionBuilder, sol, publicKey } = await import(
        "@metaplex-foundation/umi"
      );
      const { transferSol } = await import(
        "@metaplex-foundation/mpl-toolbox"
      );

      const totalPriceSOL = ticket.resalePrice / EXCHANGE_RATE;

      // ========================================
      // ATURAN 3: Hitung bagi hasil
      // ========================================
      const sellerAmount = totalPriceSOL * SELLER_SHARE;
      const promoterAmount = totalPriceSOL * PROMOTER_ROYALTY;
      const platformAmount = totalPriceSOL * PLATFORM_COMMISSION;

      const sellerWallet = ticket.walletAddress;
      const promoterWallet =
        ticket.promoterWallet || PLATFORM_WALLET; // Fallback ke platform jika tidak ada promotor

      console.log("💰 Rincian pembayaran resale:");
      console.log(`   Total: ${totalPriceSOL.toFixed(6)} SOL`);
      console.log(`   → Penjual (87%): ${sellerAmount.toFixed(6)} SOL → ${sellerWallet}`);
      console.log(`   → Promotor (10%): ${promoterAmount.toFixed(6)} SOL → ${promoterWallet}`);
      console.log(`   → Platform (3%): ${platformAmount.toFixed(6)} SOL → ${PLATFORM_WALLET}`);

      // ========================================
      // ATURAN 4: Transaksi ATOMIC
      // Semua transfer dalam 1 transaksi Solana.
      // Jika salah satu gagal, semuanya rollback.
      // ========================================
      let builder = transactionBuilder();

      // Transfer 1: 87% ke penjual
      builder = builder.add(
        transferSol(umi, {
          source: umi.identity,
          destination: publicKey(sellerWallet),
          amount: sol(sellerAmount),
        })
      );

      // Transfer 2: 10% ke promotor
      builder = builder.add(
        transferSol(umi, {
          source: umi.identity,
          destination: publicKey(promoterWallet),
          amount: sol(promoterAmount),
        })
      );

      // Transfer 3: 3% ke platform
      builder = builder.add(
        transferSol(umi, {
          source: umi.identity,
          destination: publicKey(PLATFORM_WALLET),
          amount: sol(platformAmount),
        })
      );

      // Kirim transaksi — Phantom akan meminta approval
      const result = await builder.sendAndConfirm(umi);
      const signatureBase58 = bs58.encode(result.signature);
      console.log("✅ Pembayaran berhasil! Signature:", signatureBase58);

      // ========================================
      // ATURAN 2: Update kepemilikan di backend
      // Backend akan verifikasi signature on-chain
      // sebelum memindahkan tiket ke pembeli.
      // ========================================
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy",
          ticketId: ticket.id,
          newOwnerWallet: wallet.publicKey.toBase58(),
          signature: signatureBase58,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(
          `✅ Berhasil membeli tiket!\n\n` +
          `Rincian bagi hasil:\n` +
          `• Penjual (87%): ${formatPrice(ticket.resalePrice * SELLER_SHARE)}\n` +
          `• Promotor (10%): ${formatPrice(ticket.resalePrice * PROMOTER_ROYALTY)}\n` +
          `• Platform (3%): ${formatPrice(ticket.resalePrice * PLATFORM_COMMISSION)}\n\n` +
          `Cek halaman My Tickets untuk tiket barumu.`
        );
        fetchListedTickets();
      } else {
        alert("Gagal memindahkan tiket: " + data.error);
      }
    } catch (err: any) {
      console.error("Gagal membeli:", err);
      let msg = "Terjadi kesalahan";
      if (err.message?.includes("User rejected")) msg = "Transaksi dibatalkan oleh Anda.";
      if (err.message?.includes("insufficient")) msg = "Saldo SOL tidak cukup untuk membeli tiket ini.";
      alert(msg);
    } finally {
      setBuyingTicketId(null);
    }
  }

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-icon">🎫</span>
          SolTix
        </Link>
        <div className="navbar-links">
          <Link
            href="/events"
            className="btn btn-secondary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          >
            Events
          </Link>
          <Link
            href="/my-tickets"
            className="btn btn-secondary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          >
            My Tickets
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main
        style={{ maxWidth: 1000, margin: "0 auto", padding: "3rem 2rem" }}
      >
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Pasar <span className="hero-title-gradient">Sekunder</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Beli tiket aman dari sesama pengguna (P2P) dengan bagi hasil otomatis
          </p>
          {/* Penjelasan aturan */}
          <div
            style={{
              display: "inline-flex",
              gap: "1.5rem",
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: 12,
              padding: "0.75rem 1.5rem",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span>🔒 Maks 110% harga asli</span>
            <span>💰 87% penjual · 10% promotor · 3% platform</span>
            <span>⛓️ Verified on-chain</span>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            Memuat tiket marketplace...
          </div>
        ) : tickets.length === 0 ? (
          <div
            className="card-glass"
            style={{ textAlign: "center", padding: "4rem 2rem" }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
            <h2 style={{ marginBottom: "0.5rem" }}>Marketplace Kosong</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              Belum ada pengguna yang menjual tiketnya.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {tickets.map((ticket) => {
              const isMine =
                wallet.publicKey?.toBase58() === ticket.walletAddress;
              const isBuying = buyingTicketId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className="card"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Top strip */}
                  <div
                    style={{
                      height: 6,
                      background:
                        "linear-gradient(90deg, var(--primary-500), var(--accent-500))",
                    }}
                  />

                  <div style={{ padding: "1.25rem", flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        {ticket.ticketNumber}
                      </span>
                      {isMine && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--warning)",
                            fontWeight: 700,
                            padding: "0.1rem 0.5rem",
                            background: "rgba(234,179,8,0.1)",
                            borderRadius: 99,
                          }}
                        >
                          Milik Anda
                        </span>
                      )}
                    </div>
                    <h3
                      style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        marginBottom: "0.25rem",
                        lineHeight: 1.3,
                      }}
                    >
                      {ticket.eventTitle}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--primary-300)",
                        fontWeight: 600,
                        marginBottom: "1rem",
                      }}
                    >
                      {ticket.categoryName}
                    </p>

                    {/* Harga */}
                    <div
                      style={{
                        background: "rgba(0,0,0,0.2)",
                        padding: "0.75rem",
                        borderRadius: 8,
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        Harga Jual
                      </div>
                      <div
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: 800,
                          color: "var(--success)",
                        }}
                      >
                        {formatPrice(ticket.resalePrice || 0)}
                      </div>
                      {ticket.originalPrice && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                            marginTop: "0.3rem",
                          }}
                        >
                          Harga asli: {formatPrice(ticket.originalPrice)} · Maks:{" "}
                          {formatPrice(ticket.maxResalePrice || 0)}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.2rem",
                        }}
                      >
                        Penjual:{" "}
                        {ticket.walletAddress.slice(0, 6)}...
                        {ticket.walletAddress.slice(-4)}
                      </div>
                    </div>

                    {/* Rincian bagi hasil */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.4rem",
                        flexWrap: "wrap",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {[
                        {
                          label: "Penjual",
                          pct: "87%",
                          val: (ticket.resalePrice || 0) * SELLER_SHARE,
                          color: "var(--success)",
                        },
                        {
                          label: "Promotor",
                          pct: "10%",
                          val: (ticket.resalePrice || 0) * PROMOTER_ROYALTY,
                          color: "var(--primary-300)",
                        },
                        {
                          label: "Platform",
                          pct: "3%",
                          val: (ticket.resalePrice || 0) * PLATFORM_COMMISSION,
                          color: "var(--accent-400)",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          style={{
                            flex: 1,
                            minWidth: 80,
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: 6,
                            padding: "0.4rem 0.5rem",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.6rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {item.label} ({item.pct})
                          </div>
                          <div
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: item.color,
                            }}
                          >
                            {formatPrice(Math.floor(item.val))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buy button */}
                  <div
                    style={{
                      padding: "1rem",
                      borderTop: "1px solid var(--border-subtle)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    {!wallet.connected ? (
                      <div style={{ textAlign: "center" }}>
                        <WalletButton />
                      </div>
                    ) : (
                      <button
                        onClick={() => isMine ? null : setSelectedTicket(ticket)}
                        disabled={isBuying || isMine}
                        className={`btn ${isBuying ? "btn-loading" : isMine ? "btn-secondary" : "btn-primary"}`}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        {isBuying
                          ? "Memproses Bayar..."
                          : isMine
                          ? "Tiket Anda Sendiri"
                          : "Beli Tiket Ini"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirm Buy Modal */}
      {selectedTicket && (
        <div
          onClick={() => setSelectedTicket(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-glass"
            style={{ maxWidth: 420, width: "100%", padding: "2rem" }}
          >
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                marginBottom: "0.5rem",
                textAlign: "center",
              }}
            >
              Konfirmasi Pembelian
            </h2>

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              <strong>{selectedTicket.eventTitle}</strong>
              <br />
              {selectedTicket.categoryName} · {selectedTicket.ticketNumber}
            </p>

            {/* Harga total */}
            <div
              style={{
                background: "rgba(0,0,0,0.25)",
                borderRadius: 12,
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Total Bayar
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    color: "var(--success)",
                  }}
                >
                  {formatPrice(selectedTicket.resalePrice || 0)}
                </span>
              </div>

              <div
                style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
                  📊 Rincian bagi hasil otomatis:
                </div>
                {[
                  {
                    label: "Penjual (87%)",
                    val: (selectedTicket.resalePrice || 0) * SELLER_SHARE,
                    icon: "👤",
                  },
                  {
                    label: "Promotor (10%)",
                    val: (selectedTicket.resalePrice || 0) * PROMOTER_ROYALTY,
                    icon: "🎤",
                  },
                  {
                    label: "Platform (3%)",
                    val: (selectedTicket.resalePrice || 0) * PLATFORM_COMMISSION,
                    icon: "🏢",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.3rem 0",
                    }}
                  >
                    <span>
                      {row.icon} {row.label}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {formatPrice(Math.floor(row.val))}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: "0.75rem",
                  paddingTop: "0.5rem",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                ≈{" "}
                {((selectedTicket.resalePrice || 0) / EXCHANGE_RATE).toFixed(4)}{" "}
                SOL (kurs Rp{EXCHANGE_RATE.toLocaleString("id-ID")}/SOL)
              </div>
            </div>

            {/* Info keamanan */}
            <div
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 8,
                padding: "0.75rem",
                marginBottom: "1.5rem",
                fontSize: "0.72rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              🔒 Transaksi ini aman. Seluruh pembayaran dilakukan dalam{" "}
              <strong>1 transaksi atomic</strong> di blockchain Solana. Jika
              salah satu transfer gagal, semua dana dikembalikan.
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Batal
              </button>
              <button
                onClick={() => handleBuy(selectedTicket)}
                disabled={buyingTicketId === selectedTicket.id}
                className={`btn btn-primary ${buyingTicketId === selectedTicket.id ? "btn-loading" : ""}`}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {buyingTicketId === selectedTicket.id
                  ? "Memproses..."
                  : "Bayar Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>SolTix — cNFT Concert Ticketing · Solana Devnet</p>
      </footer>
    </>
  );
}
