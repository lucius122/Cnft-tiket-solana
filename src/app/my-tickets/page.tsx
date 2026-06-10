/**
 * Halaman My Tickets — Tiket yang dimiliki user
 *
 * Menampilkan semua tiket yang terhubung ke wallet user,
 * beserta QR code untuk masuk ke venue.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { QRCodeSVG } from "qrcode.react";
import WalletButton from "@/components/WalletButton";
import type { Ticket } from "@/lib/tickets";

export default function MyTicketsPage() {
  const wallet = useWallet();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sellModalTicket, setSellModalTicket] = useState<Ticket | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    if (!wallet.publicKey) { setTickets([]); return; }
    setLoading(true);
    fetch(`/api/tickets?wallet=${wallet.publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setTickets(res.data); })
      .finally(() => setLoading(false));
  }, [wallet.publicKey]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  }

  async function handleSellTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!sellModalTicket || !sellPrice) return;
    setSelling(true);
    try {
      const price = parseInt(sellPrice.replace(/\D/g, ""), 10);
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", ticketId: sellModalTicket.id, resalePrice: price }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh tickets
        const r = await fetch(`/api/tickets?wallet=${wallet.publicKey?.toBase58()}`);
        const res2 = await r.json();
        if (res2.success) setTickets(res2.data);
        setSellModalTicket(null);
        setSellPrice("");
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error listing ticket");
    } finally {
      setSelling(false);
    }
  }

  async function handleCancelSell(ticketId: string) {
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlist", ticketId }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh tickets
        const r = await fetch(`/api/tickets?wallet=${wallet.publicKey?.toBase58()}`);
        const res2 = await r.json();
        if (res2.success) setTickets(res2.data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error unlisting ticket");
    }
  }

  const activeTickets = tickets.filter((t) => t.status === "active");
  const usedTickets = tickets.filter((t) => t.status === "redeemed");

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
          <Link href="/marketplace" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            Marketplace
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "3rem 2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Tiket <span className="hero-title-gradient">Saya</span>
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Semua tiket cNFT yang tersimpan di wallet kamu
          </p>
        </div>

        {/* Wallet not connected */}
        {!wallet.connected && (
          <div className="card-glass" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔐</div>
            <h2 style={{ marginBottom: "0.5rem" }}>Connect Wallet Dulu</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              Hubungkan Phantom wallet untuk melihat tiket kamu
            </p>
            <WalletButton />
          </div>
        )}

        {/* Loading */}
        {wallet.connected && loading && (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            Memuat tiket...
          </div>
        )}

        {/* No tickets */}
        {wallet.connected && !loading && tickets.length === 0 && (
          <div className="card-glass" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎫</div>
            <h2 style={{ marginBottom: "0.5rem" }}>Belum Ada Tiket</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              Beli tiket konser favoritmu dan dapatkan cNFT sebagai bukti kepemilikan!
            </p>
            <Link href="/events" className="btn btn-primary">
              Lihat Event Konser →
            </Link>
          </div>
        )}

        {/* Ticket list */}
        {wallet.connected && !loading && tickets.length > 0 && (
          <>
            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: "2rem" }}>
              {[
                { label: "Total Tiket", value: tickets.length, color: "var(--primary-400)" },
                { label: "Aktif", value: activeTickets.length, color: "var(--success)" },
                { label: "Sudah Dipakai", value: usedTickets.length, color: "var(--text-muted)" },
              ].map((stat) => (
                <div key={stat.label} className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: stat.color }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Active tickets */}
            {activeTickets.length > 0 && (
              <>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--success)", marginBottom: "1rem" }}>
                  ✅ Tiket Aktif ({activeTickets.length})
                </h2>
                <div className="tickets-grid" style={{ marginBottom: "2rem" }}>
                  {activeTickets.map((ticket) => (
                    <TicketCard 
                      key={ticket.id} 
                      ticket={ticket} 
                      onShowQR={() => setSelectedTicket(ticket)}
                      onSell={() => setSellModalTicket(ticket)}
                      onCancelSell={() => handleCancelSell(ticket.id)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Used tickets */}
            {usedTickets.length > 0 && (
              <>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "1rem" }}>
                  ⬜ Tiket Sudah Dipakai ({usedTickets.length})
                </h2>
                <div className="tickets-grid">
                  {usedTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} dimmed />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* QR Modal */}
      {selectedTicket && (
        <div
          onClick={() => setSelectedTicket(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-glass"
            style={{ maxWidth: 380, width: "100%", textAlign: "center", padding: "2rem" }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.25rem" }}>
              {selectedTicket.eventTitle}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              {selectedTicket.categoryName} · {selectedTicket.ticketNumber}
            </p>

            {/* QR Code */}
            <div style={{
              background: "white", padding: "1.25rem", borderRadius: 16,
              display: "inline-block", marginBottom: "1.5rem",
            }}>
              <QRCodeSVG
                value={selectedTicket.ticketNumber}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Ticket info */}
            <div style={{ textAlign: "left", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "No. Tiket", value: selectedTicket.ticketNumber },
                { label: "Venue", value: selectedTicket.venue },
                { label: "Tanggal", value: new Date(selectedTicket.eventDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) },
                { label: "Jam", value: `${selectedTicket.eventTime} WIB` },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.83rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Explorer link */}
            <a
              href={`https://explorer.solana.com/tx/${selectedTicket.mintSignature}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.8rem", color: "var(--accent-400)", display: "block", marginBottom: "1rem" }}
            >
              🔗 Lihat bukti on-chain di Solana Explorer
            </a>

            <button
              onClick={() => setSelectedTicket(null)}
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {sellModalTicket && (
        <div
          onClick={() => setSellModalTicket(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-glass"
            style={{ maxWidth: 400, width: "100%", padding: "2rem" }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.5rem", textAlign: "center" }}>
              Jual Tiket
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem", textAlign: "center", lineHeight: 1.5 }}>
              Tiket <strong>{sellModalTicket.eventTitle}</strong> ({sellModalTicket.categoryName}) akan dilisting di Marketplace.
            </p>

            <form onSubmit={handleSellTicket}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Harga Jual (IDR)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1500000"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  style={{
                    width: "100%", padding: "0.75rem 1rem", borderRadius: 8,
                    background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
                    color: "white", outline: "none", fontSize: "1rem"
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setSellModalTicket(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={selling || !sellPrice}
                  className={`btn btn-accent ${selling ? "btn-loading" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {selling ? "Loading..." : "Listing Tiket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>TiketRantai — cNFT Concert Ticketing · Solana Devnet</p>
      </footer>
    </>
  );
}

function TicketCard({
  ticket, onShowQR, onSell, onCancelSell, dimmed = false,
}: {
  ticket: Ticket;
  onShowQR?: () => void;
  onSell?: () => void;
  onCancelSell?: () => void;
  dimmed?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 0, overflow: "hidden", opacity: dimmed ? 0.6 : 1,
        borderColor: ticket.status === "active" ? "rgba(139,92,246,0.3)" : "var(--border-subtle)",
      }}
    >
      {/* Top strip */}
      <div style={{
        height: 8,
        background: ticket.status === "active"
          ? "linear-gradient(90deg, var(--primary-500), var(--accent-500))"
          : "var(--border-subtle)",
      }} />

      <div style={{ padding: "1.25rem" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.35rem", fontFamily: "monospace" }}>
          {ticket.ticketNumber}
        </div>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.25rem", lineHeight: 1.3 }}>
          {ticket.eventTitle}
        </h3>
        <p style={{ fontSize: "0.8rem", color: "var(--primary-300)", fontWeight: 600, marginBottom: "0.75rem" }}>
          {ticket.categoryName}
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
          📍 {ticket.venue}
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          📅 {new Date(ticket.eventDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · {ticket.eventTime} WIB
        </p>

        {/* Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
          {ticket.isForSale ? (
            <span style={{
              padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700,
              background: "rgba(234,179,8,0.15)", color: "var(--warning)",
            }}>
              🏷️ Dijual: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(ticket.resalePrice || 0)}
            </span>
          ) : (
            <span style={{
              padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700,
              background: ticket.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              color: ticket.status === "active" ? "var(--success)" : "var(--text-muted)",
            }}>
              {ticket.status === "active" ? "✅ Aktif" : "⬜ Digunakan"}
            </span>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {ticket.status === "active" && !ticket.isForSale && onSell && (
              <button
                onClick={onSell}
                className="btn btn-secondary"
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
              >
                Jual
              </button>
            )}
            {ticket.status === "active" && ticket.isForSale && onCancelSell && (
              <button
                onClick={onCancelSell}
                className="btn btn-secondary"
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", color: "var(--error)", borderColor: "var(--error)" }}
              >
                Batal Jual
              </button>
            )}
            {ticket.status === "active" && !ticket.isForSale && onShowQR && (
              <button
                onClick={onShowQR}
                className="btn btn-primary"
                style={{ padding: "0.4rem 0.9rem", fontSize: "0.75rem" }}
              >
                📱 QR Code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
