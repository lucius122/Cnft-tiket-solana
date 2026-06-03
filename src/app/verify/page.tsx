/**
 * Halaman Verify — Scan QR untuk panitia di venue
 *
 * Panitia/staff membuka halaman ini di perangkat mereka.
 * Mereka memasukkan nomor tiket (dari scan QR atau manual),
 * sistem memverifikasi dan menandai tiket sebagai "digunakan".
 *
 * Ini mensimulasikan "burn-on-redeem" — di sistem nyata,
 * cNFT akan di-burn dari blockchain setelah tiket dipakai.
 */

"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type VerifyResult = {
  valid: boolean;
  message: string;
  ticket?: {
    ticketNumber: string;
    eventTitle: string;
    categoryName: string;
    walletAddress: string;
    venue: string;
    eventDate: string;
    redeemedAt?: string;
  };
  error?: string;
};

export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketNumber: input.trim().toUpperCase() }),
      });

      const data = await res.json();
      setResult({
        valid: data.valid ?? false,
        message: data.message || data.error || "Tidak ada respons",
        ticket: data.ticket,
        error: data.error,
      });

      // Reset input setelah 3 detik untuk scan berikutnya
      if (data.valid) {
        setTimeout(() => {
          setInput("");
          setResult(null);
          inputRef.current?.focus();
        }, 5000);
      }
    } catch {
      setResult({ valid: false, message: "Kesalahan jaringan. Coba lagi.", error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-icon">🎫</span>
          TiketRantai
        </Link>
        <div>
          <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            Dashboard
          </Link>
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "3rem 2rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📱</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Scan <span className="hero-title-gradient">Tiket</span>
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Mode Panitia — Verifikasi tiket di pintu masuk venue
          </p>
        </div>

        {/* Scan form */}
        <div className="card-glass" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>
            🔍 Input Nomor Tiket
          </h2>
          <form onSubmit={handleVerify} style={{ display: "flex", gap: "0.75rem" }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Contoh: COLD-AB1C2D3E"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              autoFocus
              style={{
                flex: 1,
                padding: "0.875rem 1rem",
                background: "var(--bg-secondary)",
                border: "2px solid var(--border-subtle)",
                borderRadius: 12,
                color: "var(--text-primary)",
                fontSize: "1rem",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary-500)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`btn btn-accent ${loading ? "btn-loading" : ""}`}
              style={{ flexShrink: 0, padding: "0.875rem 1.5rem" }}
            >
              {loading ? "Cek..." : "Verifikasi"}
            </button>
          </form>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
            💡 Scan QR code dari tiket pengunjung menggunakan kamera, atau input manual nomor tiket
          </p>
        </div>

        {/* Result */}
        {result && (
          <div
            className="card"
            style={{
              borderColor: result.valid ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)",
              background: result.valid ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              padding: "1.5rem",
              animation: "fadeInUp 0.3s ease-out",
            }}
          >
            {/* Status indicator */}
            <div style={{ textAlign: "center", marginBottom: result.ticket ? "1.25rem" : 0 }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>
                {result.valid ? "✅" : "❌"}
              </div>
              <h2 style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: result.valid ? "var(--success)" : "var(--error)",
              }}>
                {result.valid ? "TIKET VALID" : "TIKET TIDAK VALID"}
              </h2>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                {result.message}
              </p>
            </div>

            {/* Ticket details (only when valid) */}
            {result.valid && result.ticket && (
              <div style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                padding: "1.25rem",
                marginTop: "1rem",
              }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                  {result.ticket.eventTitle}
                </h3>
                {[
                  { label: "No. Tiket", value: result.ticket.ticketNumber },
                  { label: "Kategori", value: result.ticket.categoryName },
                  { label: "Venue", value: result.ticket.venue },
                  { label: "Tanggal Event", value: formatDate(result.ticket.eventDate) },
                  { label: "Wallet Pemilik", value: `${result.ticket.walletAddress.slice(0, 8)}...${result.ticket.walletAddress.slice(-6)}` },
                ].map((row) => (
                  <div key={row.label} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "0.4rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    fontSize: "0.83rem",
                  }}>
                    <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                    <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{row.value}</span>
                  </div>
                ))}

                <div style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem 0.75rem",
                  background: "rgba(16,185,129,0.1)",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  color: "var(--success)",
                  textAlign: "center",
                }}>
                  🔒 Tiket ditandai "terpakai" — tidak bisa digunakan lagi
                </div>
              </div>
            )}

            {/* Auto-reset countdown for valid tickets */}
            {result.valid && (
              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>
                Form akan reset otomatis dalam 5 detik...
              </p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            📋 Panduan Panitia
          </h2>
          <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Minta pengunjung membuka halaman <strong>My Tickets</strong> di handphone mereka
            </li>
            <li style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Scan QR code yang ditampilkan, atau minta pengunjung menyebutkan nomor tiket
            </li>
            <li style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Input nomor tiket dan klik Verifikasi
            </li>
            <li style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              ✅ Hijau = tiket valid, izinkan masuk | ❌ Merah = tolak masuk
            </li>
            <li style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Tiket yang sudah diverifikasi tidak bisa digunakan lagi
            </li>
          </ol>
        </div>
      </main>

      <footer className="footer">
        <p>TiketRantai — Mode Panitia · Hanya untuk staff venue</p>
      </footer>
    </>
  );
}
