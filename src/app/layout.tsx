import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import WalletProviderWrapper from "./wallet-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SolTix — Tiket Konser cNFT Anti-Calo di Solana",
  description:
    "Sistem e-ticketing konser berbasis Compressed NFT (cNFT) di Solana. Transparan, aman, tidak bisa dipalsukan. Anti-calo dengan verifikasi NIK.",
  keywords: ["tiket konser", "NFT", "Solana", "blockchain", "anti-calo", "cNFT"],
};

/**
 * Root Layout — membungkus SELURUH app
 *
 * KONSEP: Kenapa WalletProvider di level layout?
 * Karena wallet connection harus persisten di semua halaman.
 * Kalau user connect di halaman landing, saat pindah ke /mint,
 * koneksi wallet tetap aktif karena WalletProvider ada di level paling atas.
 *
 * NOTE: Layout.tsx adalah Server Component (default Next.js).
 * WalletProvider butuh "use client" — makanya kita buat wrapper terpisah.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WalletProviderWrapper>{children}</WalletProviderWrapper>
      </body>
    </html>
  );
}
