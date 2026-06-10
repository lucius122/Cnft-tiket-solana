"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import WalletButton from "@/components/WalletButton";

type DashboardData = {
  metrics: {
    totalRevenue: number;
    totalTicketsSold: number;
    totalCapacity: number;
    occupancyRate: number;
  };
  eventStats: {
    id: string;
    title: string;
    revenue: number;
    sold: number;
    capacity: number;
  }[];
  recentTransactions: {
    id: string;
    ticketNumber: string;
    eventTitle: string;
    categoryName: string;
    price: number;
    walletAddress: string;
    mintedAt: string;
    status: string;
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(price);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        Memuat data dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--error)" }}>
        Gagal memuat data dashboard.
      </div>
    );
  }

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-icon">🎫</span>
          TiketRantai
        </Link>
        <div className="navbar-links">
          <Link href="/verify" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            Mode Panitia
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "3rem 2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Dashboard <span className="hero-title-gradient">Promotor</span>
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>Pantau penjualan tiket secara real-time</p>
        </div>

        {/* Top Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
          <div className="card-glass" style={{ padding: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Total Pendapatan</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary-300)" }}>
              {formatPrice(data.metrics.totalRevenue)}
            </div>
          </div>
          <div className="card-glass" style={{ padding: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Tiket Terjual</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-400)" }}>
              {data.metrics.totalTicketsSold.toLocaleString("id-ID")} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {data.metrics.totalCapacity.toLocaleString("id-ID")}</span>
            </div>
          </div>
          <div className="card-glass" style={{ padding: "1.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Tingkat Okupansi</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success)" }}>
              {data.metrics.occupancyRate.toFixed(1)}%
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          {/* Left: Event Stats */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem" }}>Penjualan Per Event</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {data.eventStats.map(evt => {
                const pct = evt.capacity > 0 ? (evt.sold / evt.capacity) * 100 : 0;
                return (
                  <div key={evt.id} style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{evt.title}</strong>
                      <span style={{ color: "var(--primary-300)", fontWeight: 600 }}>{formatPrice(evt.revenue)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                      <span>{evt.sold} / {evt.capacity} Terjual</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary-500)", borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Recent Transactions */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem" }}>Transaksi Terbaru</h2>
            {data.recentTransactions.length === 0 ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>Belum ada transaksi.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.recentTransactions.map(t => (
                  <div key={t.id} style={{ 
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.75rem", borderBottom: "1px solid var(--border-subtle)", fontSize: "0.85rem"
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.2rem" }}>{t.ticketNumber}</div>
                      <div style={{ color: "var(--text-secondary)" }}>{t.eventTitle} - {t.categoryName}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        {t.walletAddress.slice(0,6)}...{t.walletAddress.slice(-4)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "var(--success)", fontWeight: 600, marginBottom: "0.2rem" }}>+{formatPrice(t.price)}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{formatDate(t.mintedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
