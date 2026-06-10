"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import WalletButton from "@/components/WalletButton";
import type { Ticket } from "@/lib/tickets";
import bs58 from "bs58";
import { createUmiInstance } from "@/lib/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

export default function MarketplacePage() {
  const wallet = useWallet();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingTicketId, setBuyingTicketId] = useState<string | null>(null);

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
      maximumFractionDigits: 0
    }).format(price);
  }

  async function handleBuy(ticket: Ticket) {
    if (!wallet.connected || !wallet.publicKey) {
      alert("Connect wallet terlebih dahulu!");
      return;
    }

    // Jangan beli tiket sendiri
    if (wallet.publicKey.toBase58() === ticket.walletAddress) {
      alert("Ini adalah tiket Anda sendiri!");
      return;
    }

    if (!ticket.resalePrice) return;

    setBuyingTicketId(ticket.id);
    try {
      // 1. Transfer SOL ke penjual
      const { transactionBuilder, sol, publicKey } = await import("@metaplex-foundation/umi");
      const { transferSol } = await import("@metaplex-foundation/mpl-toolbox");

      const EXCHANGE_RATE = 2500000;
      const priceInSol = ticket.resalePrice / EXCHANGE_RATE;
      const sellerWallet = ticket.walletAddress;

      console.log(`Membeli tiket seharga ${priceInSol} SOL ke ${sellerWallet}`);

      let builder = transactionBuilder().add(
        transferSol(umi, {
          source: umi.identity,
          destination: publicKey(sellerWallet),
          amount: sol(priceInSol),
        })
      );

      const result = await builder.sendAndConfirm(umi);
      const signatureBase58 = bs58.encode(result.signature);
      console.log("Pembayaran SOL berhasil. Signature:", signatureBase58);

      // 2. Update kepemilikan di database
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy",
          ticketId: ticket.id,
          newOwnerWallet: wallet.publicKey.toBase58(),
          signature: signatureBase58
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Berhasil membeli tiket! Cek halaman My Tickets.");
        fetchListedTickets(); // Refresh
      } else {
        alert("Gagal memindahkan tiket: " + data.error);
      }
    } catch (err: any) {
      console.error("Gagal membeli:", err);
      let msg = "Terjadi kesalahan";
      if (err.message?.includes("User rejected")) msg = "Transaksi dibatalkan";
      if (err.message?.includes("insufficient")) msg = "Saldo SOL tidak cukup";
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
          TiketRantai
        </Link>
        <div className="navbar-links">
          <Link href="/events" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            Events
          </Link>
          <Link href="/my-tickets" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            My Tickets
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "3rem 2rem" }}>
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Pasar <span className="hero-title-gradient">Sekunder</span>
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>Beli tiket aman dari sesama pengguna (P2P)</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Memuat tiket...</div>
        ) : tickets.length === 0 ? (
          <div className="card-glass" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
            <h2 style={{ marginBottom: "0.5rem" }}>Marketplace Kosong</h2>
            <p style={{ color: "var(--text-secondary)" }}>Belum ada pengguna yang menjual tiketnya.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {tickets.map(ticket => {
              const isMine = wallet.publicKey?.toBase58() === ticket.walletAddress;
              const isBuying = buyingTicketId === ticket.id;

              return (
                <div key={ticket.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "1.25rem", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{ticket.ticketNumber}</span>
                      {isMine && <span style={{ fontSize: "0.7rem", color: "var(--warning)", fontWeight: 700, padding: "0.1rem 0.5rem", background: "rgba(234,179,8,0.1)", borderRadius: 99 }}>Milik Anda</span>}
                    </div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem", lineHeight: 1.3 }}>{ticket.eventTitle}</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--primary-300)", fontWeight: 600, marginBottom: "1rem" }}>{ticket.categoryName}</p>
                    
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: 8, marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Harga Jual</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--success)" }}>
                        {formatPrice(ticket.resalePrice || 0)}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        Penjual: {ticket.walletAddress.slice(0,6)}...{ticket.walletAddress.slice(-4)}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ padding: "1rem", borderTop: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                    <button
                      onClick={() => handleBuy(ticket)}
                      disabled={isBuying || isMine || !wallet.connected}
                      className={`btn ${isBuying ? "btn-loading" : isMine ? "btn-secondary" : "btn-primary"}`}
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      {isBuying ? "Memproses Bayar..." : isMine ? "Tiket Anda Sendiri" : "Beli Tiket Ini"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
