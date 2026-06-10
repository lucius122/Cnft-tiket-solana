"use client";

/**
 * Landing Page — Halaman utama SolTix
 *
 * Menampilkan:
 * 1. Navbar dengan branding + wallet button + nav links
 * 2. Hero section dengan tagline + animasi
 * 3. Quick actions (navigasi ke halaman utama)
 * 4. Feature cards yang menjelaskan keunggulan sistem
 * 5. Footer
 */

import WalletButton from "@/components/WalletButton";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-icon">🎫</span>
          SolTix
        </Link>
        <div className="navbar-links">
          <div className="navbar-links-nav">
            <Link href="/events" style={{ color: "var(--text-secondary)", fontSize: "0.875rem", textDecoration: "none", padding: "0.4rem 0.75rem", borderRadius: 8, transition: "color 0.2s" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-secondary)")}>
              Events
            </Link>
            <Link href="/my-tickets" style={{ color: "var(--text-secondary)", fontSize: "0.875rem", textDecoration: "none", padding: "0.4rem 0.75rem", borderRadius: 8, transition: "color 0.2s" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-secondary)")}>
              My Tickets
            </Link>
            <Link href="/register" style={{ color: "var(--text-secondary)", fontSize: "0.875rem", textDecoration: "none", padding: "0.4rem 0.75rem", borderRadius: 8, transition: "color 0.2s" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-secondary)")}>
              Registrasi
            </Link>
          </div>
          <WalletButton />
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Powered by Solana cNFT · Devnet
        </div>

        <h1 className="hero-title">
          Tiket Konser{" "}
          <span className="hero-title-gradient">Anti-Calo</span>
          <br />
          Berbasis Blockchain
        </h1>

        <p className="hero-subtitle">
          Sistem e-ticketing modern menggunakan Compressed NFT di Solana.
          Transparan, tidak bisa dipalsukan, dan anti-percaloan.
          Satu NIK = satu wallet, maks. 4 tiket per orang.
        </p>

        <div className="hero-actions">
          <Link href="/events" className="btn btn-primary" id="browse-events-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Lihat Event Konser
          </Link>
          <Link href="/register" className="btn btn-secondary" id="register-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Daftar Sekarang
          </Link>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "0 2rem 3rem" }}>
        <div className="quick-actions-grid">
          {[
            { href: "/events", icon: "🎵", label: "Browse Events", desc: "Lihat semua konser tersedia", color: "var(--primary-400)" },
            { href: "/register", icon: "🪪", label: "Daftar NIK", desc: "Verifikasi identitasmu", color: "var(--accent-400)" },
            { href: "/my-tickets", icon: "🎫", label: "Tiket Saya", desc: "Lihat & tampilkan QR", color: "var(--success)" },
            { href: "/verify", icon: "📱", label: "Scan Tiket", desc: "Mode panitia venue", color: "var(--warning)" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "1.25rem", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: item.color, marginBottom: "0.25rem" }}>{item.label}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section">
        <h2 className="features-title">Keunggulan Sistem</h2>
        <div className="features-grid">
          {/* Feature 1 */}
          <div className="card feature-card">
            <div className="feature-icon feature-icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3>Anti-Calo</h3>
            <p>
              Maks. 4 tiket per wallet dengan verifikasi NIK.
              1 NIK = 1 wallet — calo tidak bisa borong tiket.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card feature-card">
            <div className="feature-icon feature-icon-cyan">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <h3>Compressed NFT</h3>
            <p>
              Biaya mint {"<"}$0.01 per tiket berkat teknologi Merkle Tree.
              Ribuan tiket bisa dicetak dengan biaya sangat minimal.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card feature-card">
            <div className="feature-icon feature-icon-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h3>Burn-on-Redeem</h3>
            <p>
              Tiket di-scan dan ditandai "terpakai" saat masuk venue.
              Tidak bisa digunakan dua kali — 100% anti-duplikasi.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="card feature-card">
            <div className="feature-icon" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))", color: "var(--warning)", width: 56, height: 56, margin: "0 auto 1.25rem", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3>Transparan On-Chain</h3>
            <p>
              Setiap transaksi tiket bisa dicek di Solana Explorer.
              Riwayat kepemilikan tidak bisa dimanipulasi.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="card feature-card">
            <div className="feature-icon feature-icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <h3>QR Code Unik</h3>
            <p>
              Setiap tiket punya QR code yang berisi nomor tiket on-chain.
              Scan di venue untuk verifikasi instan.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="card feature-card">
            <div className="feature-icon feature-icon-cyan">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3>Solana Devnet</h3>
            <p>
              Dibangun di atas Solana untuk kecepatan, skalabilitas,
              dan biaya transaksi yang sangat rendah.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", padding: "0 2rem 6rem" }}>
        <h2 className="features-title">Cara Kerja</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            { step: "01", title: "Daftarkan NIK", desc: "Link KTP kamu ke wallet Phantom. 1 NIK = 1 wallet, tidak bisa dimanipulasi.", href: "/register", cta: "Daftar" },
            { step: "02", title: "Pilih Event & Beli Tiket", desc: "Browse konser, pilih kategori kursi, dan approve transaksi di Phantom.", href: "/events", cta: "Lihat Events" },
            { step: "03", title: "Tiket cNFT di Wallet", desc: "Tiketmu langsung muncul sebagai cNFT di Phantom. Buka 'My Tickets' untuk QR code.", href: "/my-tickets", cta: "My Tickets" },
            { step: "04", title: "Scan di Venue", desc: "Tunjukkan QR code ke panitia. Tiket diverifikasi on-chain dan ditandai terpakai.", href: "/verify", cta: "Mode Panitia" },
          ].map((item) => (
            <div key={item.step} className="card step-card">
              <div style={{
                minWidth: 48, height: 48, borderRadius: 14,
                background: "linear-gradient(135deg, var(--primary-700), var(--primary-900))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.8rem", fontWeight: 800, color: "var(--primary-300)",
                border: "1px solid var(--border-active)",
              }}>
                {item.step}
              </div>
              <div className="step-card-content">
                <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.35rem" }}>{item.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
              <Link href={item.href} className="btn btn-secondary step-card-cta" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
                {item.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>
          SolTix — Sistem E-Ticketing Konser cNFT Anti-Calo
          <br />
          Lutfi Braja Munirozaman · G.211.23.0008 · Teknik Komputer
          <br />
          Built on{" "}
          <a href="https://solana.com" target="_blank" rel="noopener noreferrer">Solana</a>{" "}
          with{" "}
          <a href="https://www.metaplex.com/" target="_blank" rel="noopener noreferrer">Metaplex Bubblegum</a>
          {" · "}
          <Link href="/verify" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Mode Panitia</Link>
        </p>
      </footer>
    </>
  );
}
