/**
 * Halaman Detail Event — Pilih kategori tiket dan beli
 *
 * Flow:
 * 1. Ambil data event dari API
 * 2. User pilih kategori kursi
 * 3. Klik "Beli Tiket" → mint cNFT via Umi + Phantom
 * 4. Setelah mint berhasil → POST ke /api/tickets (simpan record)
 * 5. Redirect ke /my-tickets
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mintV1 } from "@metaplex-foundation/mpl-bubblegum";
import type { Collection } from "@metaplex-foundation/mpl-bubblegum";
import { publicKey, none } from "@metaplex-foundation/umi";
import WalletButton from "@/components/WalletButton";
import { createUmiInstance } from "@/lib/umi";
import type { Event } from "@/lib/events";
import bs58 from "bs58";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wallet = useWallet();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [step, setStep] = useState<"idle" | "minting" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  const umi = useMemo(() => {
    const instance = createUmiInstance();
    if (wallet) return instance.use(walletAdapterIdentity(wallet));
    return instance;
  }, [wallet]);

  // Fetch event data
  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const found = res.data.find((e: Event) => e.id === eventId);
          setEvent(found ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  // Cek apakah wallet sudah registrasi
  useEffect(() => {
    if (!wallet.publicKey) { setIsRegistered(null); return; }
    fetch(`/api/register?wallet=${wallet.publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((res) => setIsRegistered(res.registered ?? false));
  }, [wallet.publicKey]);

  const treeAddress = process.env.NEXT_PUBLIC_TREE_ADDRESS;

  async function handleBuy() {
    if (!wallet.publicKey || !event || !selectedCategory) return;

    setBuying(true);
    setStep("minting");
    setErrorMsg("");

    try {
      // Pastikan tree address ada
      if (!treeAddress) throw new Error("Merkle Tree belum dikonfigurasi. Jalankan scripts/create-tree.ts");

      const category = event.categories.find((c) => c.id === selectedCategory)!;

      // STEP 1: Mint cNFT via Umi + Phantom
      console.log("🎫 Minting cNFT tiket...");
      // Nama cNFT dibatasi max 32 karakter oleh Bubblegum program
      // Kita pakai format singkat: "TKT-{artist}-{category}" lalu potong jika perlu
      const shortName = `TKT-${event.artist}-${category.id}`.slice(0, 32);

      const result = await mintV1(umi, {
        leafOwner: publicKey(wallet.publicKey.toBase58()),
        merkleTree: publicKey(treeAddress),
        metadata: {
          name: shortName,
          symbol: "TIKET",
          uri: `https://raw.githubusercontent.com/solana-developers/program-examples/main/tokens/tokens/compressed-nfts/uri.json`,
          sellerFeeBasisPoints: 1000, // 10% royalti
          collection: none<Collection>(),
          creators: [{ address: umi.identity.publicKey, verified: false, share: 100 }],
        },
      }).sendAndConfirm(umi);

      const sig = bs58.encode(result.signature);
      setTxSignature(sig);
      console.log("✅ cNFT berhasil di-mint! Signature:", sig.slice(0, 20) + "...");

      // STEP 2: Simpan record ke API
      setStep("saving");
      const saveRes = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: wallet.publicKey.toBase58(),
          eventId: event.id,
          categoryId: selectedCategory,
          mintSignature: sig,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error);

      setStep("done");
      console.log("✅ Tiket tersimpan:", saveData.data.ticketNumber);

      // Redirect ke my-tickets setelah 3 detik
      setTimeout(() => router.push("/my-tickets"), 3000);
    } catch (err: unknown) {
      setStep("error");
      let msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User rejected")) msg = "Transaksi dibatalkan. Kamu menolak di Phantom.";
      if (msg.includes("insufficient")) msg = "SOL tidak cukup. Request airdrop di faucet.solana.com";
      if (msg.includes("429") || msg.includes("rate")) msg = "Server Solana sibuk. Tunggu 30 detik lalu coba lagi.";
      setErrorMsg(msg);
    } finally {
      setBuying(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
      Memuat event...
    </div>
  );

  if (!event) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <div style={{ fontSize: "3rem" }}>😕</div>
      <p style={{ color: "var(--text-muted)" }}>Event tidak ditemukan</p>
      <Link href="/events" className="btn btn-secondary">← Kembali ke Events</Link>
    </div>
  );

  const selectedCat = event.categories.find((c) => c.id === selectedCategory);
  const isSoldOut = selectedCat ? selectedCat.sold >= selectedCat.capacity : false;

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-icon">🎫</span>
          TiketRantai
        </Link>
        <div className="navbar-links">
          <Link href="/events" style={{ color: "var(--text-secondary)", fontSize: "0.875rem", textDecoration: "none" }}>
            ← Events
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "3rem 2rem" }}>
        <div className="event-detail-grid">
          {/* Left: Event Info */}
          <div>
            {/* Event header */}
            <div style={{
              background: `linear-gradient(135deg, ${event.categories[0]?.color}22, var(--bg-secondary))`,
              borderRadius: 20, padding: "2.5rem", marginBottom: "1.5rem",
              border: "1px solid var(--border-subtle)",
            }}>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                {event.tags.map((tag) => (
                  <span key={tag} style={{
                    padding: "0.2rem 0.75rem", background: "rgba(139,92,246,0.15)",
                    borderRadius: 999, fontSize: "0.75rem", color: "var(--primary-300)",
                  }}>{tag}</span>
                ))}
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem", lineHeight: 1.3 }}>
                {event.title}
              </h1>
              <p style={{ fontSize: "1rem", color: "var(--accent-400)", fontWeight: 600, marginBottom: "1.5rem" }}>
                {event.artist}
              </p>
              <div className="event-info-grid">
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>📅 Tanggal</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{formatDate(event.date)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>⏰ Jam</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{event.time} WIB</div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>📍 Venue</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{event.venue}</div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Tentang Event</h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.9rem" }}>
                {event.description}
              </p>
            </div>

            {/* Anti-calo info */}
            <div className="card" style={{
              background: "rgba(139,92,246,0.05)", borderColor: "var(--border-active)",
            }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--primary-300)" }}>
                🛡️ Sistem Anti-Calo
              </h2>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "0.5rem" }}>
                  <span style={{ color: "var(--success)" }}>✓</span>
                  Maksimal <strong>{event.maxPerWallet} tiket</strong> per wallet per event
                </li>
                <li style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "0.5rem" }}>
                  <span style={{ color: "var(--success)" }}>✓</span>
                  Wajib registrasi NIK — 1 NIK = 1 wallet
                </li>
                <li style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "0.5rem" }}>
                  <span style={{ color: "var(--success)" }}>✓</span>
                  Kepemilikan tiket tersimpan di blockchain Solana
                </li>
                <li style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "0.5rem" }}>
                  <span style={{ color: "var(--success)" }}>✓</span>
                  Tiket hanya bisa dipakai sekali (burn-on-redeem)
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Purchase Card */}
          <div className="card-glass" style={{ position: "sticky", top: "80px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.25rem" }}>Pilih Kategori</h2>

            {/* Category options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {event.categories.map((cat) => {
                const full = cat.sold >= cat.capacity;
                const pct = Math.round((cat.sold / cat.capacity) * 100);
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => !full && setSelectedCategory(cat.id)}
                    disabled={full}
                    style={{
                      padding: "1rem",
                      borderRadius: 14,
                      border: `2px solid ${isSelected ? cat.color : "var(--border-subtle)"}`,
                      background: isSelected ? `${cat.color}15` : "var(--bg-secondary)",
                      cursor: full ? "not-allowed" : "pointer",
                      textAlign: "left",
                      opacity: full ? 0.5 : 1,
                      transition: "all 0.2s",
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: isSelected ? cat.color : "var(--text-primary)" }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          {cat.sold}/{cat.capacity} terjual
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: isSelected ? cat.color : "var(--text-primary)" }}>
                        {formatPrice(cat.price)}
                      </div>
                    </div>
                    {/* Progress */}
                    <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 999 }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Status info */}
            {!wallet.connected ? (
              <div className="mint-status mint-status-error" style={{ marginBottom: "1rem" }}>
                ⚠️ Connect wallet dulu untuk membeli tiket
              </div>
            ) : isRegistered === false ? (
              <div className="mint-status mint-status-error" style={{ marginBottom: "1rem", textAlign: "left" }}>
                ⚠️ Wallet belum terdaftar!{" "}
                <Link href="/register" style={{ color: "var(--primary-300)", textDecoration: "underline" }}>
                  Daftar NIK sekarang
                </Link>
              </div>
            ) : !treeAddress ? (
              <div className="mint-status mint-status-error" style={{ marginBottom: "1rem" }}>
                ⚠️ Merkle Tree belum dikonfigurasi
              </div>
            ) : null}

            {/* Buy button */}
            <button
              id="buy-ticket-btn"
              onClick={handleBuy}
              disabled={
                !wallet.connected || !selectedCategory || buying || isSoldOut ||
                !treeAddress || isRegistered === false || isRegistered === null
              }
              className={`btn btn-accent ${buying ? "btn-loading" : ""}`}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {buying
                ? step === "minting"
                  ? "Minting cNFT... (approve di Phantom)"
                  : "Menyimpan tiket..."
                : selectedCat
                ? `Beli ${selectedCat.name} — ${formatPrice(selectedCat.price)}`
                : "Pilih Kategori Dulu"}
            </button>

            {/* Result messages */}
            {step === "done" && (
              <div className="mint-status mint-status-success" style={{ marginTop: "1rem" }}>
                🎉 Tiket berhasil dibeli! cNFT sudah di wallet kamu.<br />
                <small>Redirect ke My Tickets dalam 3 detik...</small>
                {txSignature && (
                  <>
                    <br />
                    <a
                      href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: "var(--accent-400)" }}
                    >
                      Lihat di Solana Explorer →
                    </a>
                  </>
                )}
              </div>
            )}
            {step === "error" && (
              <div className="mint-status mint-status-error" style={{ marginTop: "1rem" }}>
                ❌ {errorMsg}
              </div>
            )}

            {/* Info */}
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", marginTop: "1rem", lineHeight: 1.6 }}>
              Pembayaran simulasi (Devnet) · Tiket sebagai cNFT di Solana
            </p>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>TiketRantai — cNFT Concert Ticketing · Solana Devnet</p>
      </footer>
    </>
  );
}
