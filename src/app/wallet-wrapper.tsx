"use client";

/**
 * Wallet Wrapper — Bridge antara Server Component dan Client Component
 *
 * KONSEP: Server vs Client Components di Next.js
 * - layout.tsx = Server Component (dirender di server, lebih cepat, SEO-friendly)
 * - WalletProvider = Client Component (butuh browser API untuk koneksi wallet)
 *
 * Masalah: Kita tidak bisa langsung pakai Client Component di dalam Server Component
 * tanpa menandainya sebagai "use client". File wrapper ini menjembatani keduanya.
 */

import WalletProvider from "@/components/WalletProvider";
import type { ReactNode } from "react";

export default function WalletProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <WalletProvider>{children}</WalletProvider>;
}
