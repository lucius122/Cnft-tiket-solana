/**
 * Halaman Registrasi — Daftarkan NIK ↔ Wallet
 *
 * KONSEP ANTI-CALO:
 * Sistem mewajibkan setiap pembeli mendaftarkan NIK (KTP) sebelum bisa
 * membeli tiket. 1 NIK hanya bisa terhubung ke 1 wallet. Ini mencegah
 * calo mendaftarkan banyak akun untuk memborong tiket.
 *
 * Privasi: NIK di-hash SHA-256 sebelum disimpan — sistem tidak menyimpan
 * NIK asli, hanya sidik jari digitalnya.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import WalletButton from "@/components/WalletButton";

export default function RegisterPage() {
  const wallet = useWallet();
  const [form, setForm] = useState({ nik: "", name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState<{ registered: boolean; name?: string } | null>(null);

  // Cek apakah wallet sudah terdaftar
  useEffect(() => {
    if (!wallet.publicKey) { setAlreadyRegistered(null); return; }
    fetch(`/api/register?wallet=${wallet.publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((res) => {
        setAlreadyRegistered({ registered: res.registered, name: res.data?.name });
      });
  }, [wallet.publicKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nik: form.nik,
          walletAddress: wallet.publicKey.toBase58(),
          name: form.name,
          email: form.email,
        }),
      });

      const data = await res.json();
      setResult({ success: data.success, message: data.message || data.error });

      if (data.success) {
        setAlreadyRegistered({ registered: true, name: form.name });
        setForm({ nik: "", name: "", email: "" });
      }
    } catch {
      setResult({ success: false, message: "Terjadi kesalahan jaringan. Coba lagi." });
    } finally {
      setLoading(false);
    }
  }

  function formatNik(value: string) {
    // Hanya angka, max 16 karakter
    return value.replace(/\D/g, "").slice(0, 16);
  }

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-icon">🎫</span>
          SolTix
        </Link>
        <div className="navbar-links">
          <Link href="/events" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            Events
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "3rem 2rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛡️</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Registrasi <span className="hero-title-gradient">Identitas</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Daftarkan NIK kamu untuk mengaktifkan pembelian tiket.
            <br />
            <strong>1 NIK = 1 wallet = Maks. 4 tiket per event</strong>
          </p>
        </div>

        {/* Already registered */}
        {alreadyRegistered?.registered && (
          <div className="card" style={{
            background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)",
            marginBottom: "1.5rem", textAlign: "center",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✅</div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--success)", marginBottom: "0.5rem" }}>
              Sudah Terdaftar!
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Wallet ini terdaftar atas nama <strong>{alreadyRegistered.name}</strong>.
              Kamu sudah bisa membeli tiket konser.
            </p>
            <Link href="/events" className="btn btn-primary" style={{ display: "inline-flex" }}>
              Lihat Event Konser →
            </Link>
          </div>
        )}

        {/* Not connected */}
        {!wallet.connected && (
          <div className="card-glass" style={{ textAlign: "center", padding: "2.5rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔐</div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Connect wallet Phantom dulu sebelum registrasi
            </p>
            <WalletButton />
          </div>
        )}

        {/* Registration form */}
        {wallet.connected && !alreadyRegistered?.registered && (
          <div className="card-glass">
            {/* Wallet info */}
            <div style={{
              padding: "0.75rem 1rem",
              background: "rgba(139,92,246,0.1)",
              borderRadius: 10,
              marginBottom: "1.5rem",
              fontSize: "0.82rem",
            }}>
              <div style={{ color: "var(--text-muted)", marginBottom: "0.25rem" }}>Mendaftar untuk wallet:</div>
              <div style={{ fontFamily: "monospace", color: "var(--primary-300)", fontWeight: 600, wordBreak: "break-all" }}>
                {wallet.publicKey?.toBase58()}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* NIK field */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  NIK (Nomor Induk Kependudukan) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="16 digit angka sesuai KTP"
                  value={form.nik}
                  onChange={(e) => setForm({ ...form, nik: formatNik(e.target.value) })}
                  required
                  maxLength={16}
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    color: "var(--text-primary)",
                    fontSize: "1rem",
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-500)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                />
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                  {form.nik.length}/16 digit · NIK tidak disimpan, hanya hash-nya
                </div>
              </div>

              {/* Name field */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  placeholder="Sesuai KTP"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-500)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                />
              </div>

              {/* Email field */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Alamat Email *
                </label>
                <input
                  type="email"
                  placeholder="email@contoh.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary-500)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                />
              </div>

              {/* Result */}
              {result && (
                <div className={`mint-status ${result.success ? "mint-status-success" : "mint-status-error"}`}>
                  {result.success ? "✅" : "❌"} {result.message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || form.nik.length !== 16}
                className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loading ? "Mendaftarkan..." : "Daftarkan Identitas Saya"}
              </button>
            </form>

            {/* Privacy note */}
            <div style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "rgba(6,182,212,0.05)",
              borderRadius: 10,
              border: "1px solid rgba(6,182,212,0.1)",
            }}>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                🔒 <strong>Privasi:</strong> NIK kamu di-hash menggunakan SHA-256 sebelum disimpan.
                Kami tidak bisa membaca NIK asli kamu dari database.
                Data ini hanya digunakan untuk mencegah percaloan.
              </p>
            </div>
          </div>
        )}

        {/* Anti-calo explanation */}
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem" }}>
            🛡️ Bagaimana Sistem Anti-Calo Bekerja?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { icon: "1️⃣", text: "Kamu mendaftarkan NIK KTP dengan wallet Phantom kamu" },
              { icon: "2️⃣", text: "Sistem memverifikasi: 1 NIK hanya bisa terhubung ke 1 wallet" },
              { icon: "3️⃣", text: "Setiap pembelian tiket dibatasi maks. 4 tiket per event" },
              { icon: "4️⃣", text: "Tiket sebagai cNFT di blockchain — tidak bisa dipalsukan atau diduplikasi" },
              { icon: "5️⃣", text: "Saat masuk venue, tiket di-scan dan di-mark sebagai 'terpakai'" },
            ].map((item) => (
              <div key={item.icon} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{item.icon}</span>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>SolTix — cNFT Concert Ticketing · Solana Devnet</p>
      </footer>
    </>
  );
}
