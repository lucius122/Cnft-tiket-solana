/**
 * Halaman Events — Katalog Konser
 *
 * Menampilkan semua event konser yang tersedia.
 * Data diambil dari API /api/events (off-chain: events.json)
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import WalletButton from "@/components/WalletButton";
import type { Event } from "@/lib/events";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "on-sale" | "coming-soon">("all");

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setEvents(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? events : events.filter((e) => e.status === filter);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
  }

  function getLowestPrice(event: Event) {
    return Math.min(...event.categories.map((c) => c.price));
  }

  function getTotalSold(event: Event) {
    return event.categories.reduce((sum, c) => sum + c.sold, 0);
  }

  function getTotalCapacity(event: Event) {
    return event.categories.reduce((sum, c) => sum + c.capacity, 0);
  }

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-icon">🎫</span>
          TiketRantai
        </Link>
        <div className="navbar-links">
          <Link href="/my-tickets" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            Tiket Saya
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "3rem 2rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div className="hero-badge" style={{ marginBottom: "1rem", display: "inline-flex" }}>
            <span className="hero-badge-dot" />
            Tiket cNFT · Solana Devnet
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Event Konser{" "}
            <span className="hero-title-gradient">Terkini</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
            Setiap tiket adalah cNFT di Solana — transparan, aman, tidak bisa dipalsukan.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="filter-tabs">
          {[
            { key: "all", label: "Semua Event" },
            { key: "on-sale", label: "🔥 On Sale" },
            { key: "coming-soon", label: "🔜 Segera" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "999px",
                border: "1px solid",
                borderColor: filter === tab.key ? "var(--primary-500)" : "var(--border-subtle)",
                background: filter === tab.key ? "rgba(139,92,246,0.15)" : "transparent",
                color: filter === tab.key ? "var(--primary-300)" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            Memuat event...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
            Tidak ada event yang tersedia
          </div>
        ) : (
          <div className="events-grid">
            {filtered.map((event) => {
              const sold = getTotalSold(event);
              const capacity = getTotalCapacity(event);
              const soldPct = Math.round((sold / capacity) * 100);
              const isSoldOut = event.status === "sold-out";
              const isComingSoon = event.status === "coming-soon";

              return (
                <div key={event.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  {/* Poster area */}
                  <div style={{
                    height: 200,
                    background: `linear-gradient(135deg, ${event.categories[0]?.color}33, var(--bg-secondary))`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    <div style={{ fontSize: "5rem", opacity: 0.3, position: "absolute" }}>🎵</div>
                    <div style={{ position: "relative", textAlign: "center" }}>
                      <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎤</div>
                      <div style={{
                        background: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(8px)",
                        padding: "0.35rem 0.85rem",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: event.status === "on-sale" ? "#10b981" : event.status === "coming-soon" ? "#f59e0b" : "#ef4444",
                        border: `1px solid currentColor`,
                      }}>
                        {event.status === "on-sale" ? "🔥 ON SALE" : event.status === "coming-soon" ? "🔜 SEGERA" : "SOLD OUT"}
                      </div>
                    </div>
                    {/* Tags */}
                    <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", display: "flex", gap: "0.4rem" }}>
                      {event.tags.map((tag) => (
                        <span key={tag} style={{
                          padding: "0.2rem 0.6rem",
                          background: "rgba(0,0,0,0.5)",
                          borderRadius: "999px",
                          fontSize: "0.7rem",
                          color: "var(--text-secondary)",
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.35rem", lineHeight: 1.3 }}>
                      {event.title}
                    </h2>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      📍 {event.venue}
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      📅 {formatDate(event.date)} · {event.time} WIB
                    </p>

                    {/* Sold progress */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                        <span>Terjual</span>
                        <span style={{ fontWeight: 700, color: soldPct > 80 ? "#ef4444" : "var(--text-secondary)" }}>
                          {sold.toLocaleString()} / {capacity.toLocaleString()} ({soldPct}%)
                        </span>
                      </div>
                      <div style={{ height: 6, background: "var(--border-subtle)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${soldPct}%`,
                          background: soldPct > 80
                            ? "linear-gradient(90deg, #ef4444, #f59e0b)"
                            : "linear-gradient(90deg, var(--primary-500), var(--accent-500))",
                          borderRadius: 999,
                          transition: "width 1s ease",
                        }} />
                      </div>
                    </div>

                    {/* Price + CTA */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Mulai dari</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary-300)" }}>
                          {formatPrice(getLowestPrice(event))}
                        </div>
                      </div>
                      <Link
                        href={`/events/${event.id}`}
                        className={`btn ${isComingSoon || isSoldOut ? "btn-secondary" : "btn-primary"}`}
                        style={{ padding: "0.625rem 1.25rem", fontSize: "0.875rem" }}
                      >
                        {isComingSoon ? "Info" : isSoldOut ? "Habis" : "Beli Tiket →"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          TiketRantai — cNFT Concert Ticketing · Solana Devnet<br />
          Lutfi Braja Munirozaman · G.211.23.0008
        </p>
      </footer>
    </>
  );
}
