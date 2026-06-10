# PROJECT BRIEF — Sistem E-Ticketing Konser Berbasis cNFT Solana (Anti-Calo)

**Penulis:** Lutfi Braja Munirozaman | NIM: G.211.23.0008 | Teknik Komputer  
**Tujuan:** MVP demo UTS — Solana Devnet  
**Stack:** Next.js 14 + TypeScript + TailwindCSS + Metaplex Bubblegum SDK  
**Dibuat:** 2026-06-04  

---

## Ringkasan Singkat untuk AI (baca ini tiap sesi baru!)

Proyek ini adalah sistem e-ticketing konser berbasis Compressed NFT (cNFT) di Solana Devnet.
Goal utama: demo UTS yang berjalan di laptop, bukan production.

### Status Fase Saat Ini
- **Fase 0:** ✅ Environment setup — Node v22, Solana CLI v3.1.9, keypair ada. **PERLU: airdrop SOL + jalankan create-tree.ts**
- **Fase 1:** ✅ Landing page, halaman mint, komponen wallet — semua kode sudah ada. **PERLU: Merkle Tree address di .env.local**
- **Fase 2:** ✅ Kode selesai — Events catalog, event detail + buy, my-tickets + QR, API routes
- **Fase 3:** ✅ Kode selesai — Register NIK, verify/scan, anti-calo logic di API
- **Fase 4:** ⬜ Belum dimulai (dashboard promotor)


### File Penting
- `src/app/page.tsx` — Landing page
- `src/app/mint/page.tsx` — Halaman mint cNFT demo
- `src/lib/umi.ts` — Setup Umi instance
- `src/lib/mint.ts` — Logic minting cNFT
- `src/components/WalletButton.tsx` — Tombol connect wallet
- `src/components/WalletProvider.tsx` — Provider wallet adapter
- `scripts/create-tree.ts` — Script buat Merkle Tree (jalankan sekali)
- `.env.local` — Environment variables (TREE_ADDRESS & COLLECTION_MINT diisi setelah setup)

---

## A. Analisis Kelayakan per Fitur

| # | Fitur | Status | Keterangan |
|---|-------|--------|------------|
| 1 | Registrasi & verifikasi pembeli (wallet-bound identity) | ✅ **MVP** | Cukup simpan NIK → wallet address di database lokal (JSON/SQLite). Verifikasi 1 NIK = 1 wallet di backend. |
| 2 | Mass minting cNFT (skalabilitas, biaya minim) | ✅ **MVP** | Merkle Tree sudah disiapkan. Mint per-user saat beli tiket. |
| 3 | Dashboard promotor (monitor penjualan real-time) | ✅ **MVP** | Versi sederhana: tabel + counter dari database lokal. Real-time via polling setiap 5 detik. |
| 4 | Immutable ownership ledger (riwayat on-chain) | ⚠️ **Simulasi** | Untuk demo: tampilkan link Solana Explorer dari signature transaksi. On-chain sepenuhnya, tapi UI-nya sederhana. |
| 5 | Validasi QR code (burn-on-redeem) | ⚠️ **Simulasi** | QR code dibuat dari data tiket (di-generate client-side). Burn on-chain perlu Anchor program — untuk demo, simulasikan dengan flag "redeemed" di database. |
| 6 | Solana Pay (pembayaran instan) | ⚠️ **Simulasi** | SOL devnet tidak ada nilai nyata. Implementasi Solana Pay QR bisa diintegrasikan, tapi untuk demo cukup simulasi transfer. |
| 7 | Marketplace resale (price cap 110% + royalti 10%) | ❌ **Future Work** | Butuh Anchor program custom. Terlalu kompleks untuk UTS. Presentasikan sebagai rencana pengembangan. |
| 8 | Anti-Sybil (pencegahan bot calo) | ⚠️ **Simulasi** | Versi sederhana: 1 wallet = max 4 tiket, cek di backend. Untuk demo ini sudah cukup menjelaskan konsep. |
| 9 | UI ramah Web3-pemula | ✅ **MVP** | Sudah ada landing page + mint page. Akan ditingkatkan dengan event catalog, my-tickets, QR viewer. |
| 10 | Keamanan, privasi, skalabilitas | ⚠️ **Konseptual** | Implementasikan yang bisa (max tiket/wallet, Devnet isolation). Sisanya jelaskan di presentasi. |

---

## B. Roadmap Bertahap (Milestone)

### 🔵 Fase 0 — Setup Environment
**Status:** Partial ✅ (Next.js project sudah ada)  
**Tujuan:** Semua tool siap, bisa jalankan `npm run dev`, bisa connect Phantom  
**Deliverable:**
- Node.js v20+ terinstall
- Solana CLI terinstall
- Keypair developer terbuat + di-airdrop SOL devnet
- `npm run dev` jalan di http://localhost:3000
- Phantom wallet terinstall di browser (mode Devnet)

**Estimasi:** 30-60 menit  
**Kesulitan:** ⭐⭐ (setup WSL + Solana CLI bisa tricky)

---

### 🟢 Fase 1 — Foundation: Connect Wallet + Mint cNFT
**Status:** 🔄 Dalam pengerjaan  
**Tujuan:** User bisa connect Phantom, klik mint, lihat cNFT di wallet  
**Deliverable:**
- Landing page bagus
- Tombol "Connect Wallet" dengan Phantom berfungsi
- Merkle Tree sudah dibuat (`scripts/create-tree.ts`)
- Halaman `/mint` bisa mint 1 cNFT ke Phantom wallet
- Link Solana Explorer setelah berhasil mint

**Yang perlu diselesaikan:**
- Jalankan `scripts/create-tree.ts` → isi NEXT_PUBLIC_TREE_ADDRESS di .env.local
- Test mint dari browser

**Estimasi:** 1-2 jam  
**Kesulitan:** ⭐⭐⭐ (Merkle Tree + Phantom approval)

---

### 🟡 Fase 2 — Core Ticketing: Event, Beli Tiket, My-Tickets, QR
**Tujuan:** Sistem tiket lengkap — pilih event, beli, lihat tiket, scan QR  
**Deliverable:**
- Halaman `/events` — katalog konser (data mock)
- Halaman `/events/[id]` — detail event + tombol beli
- Halaman `/my-tickets` — daftar tiket yang dimiliki (cek dari Solana)
- Halaman `/scan` — tampilkan QR code tiket
- API route `/api/tickets` — simpan metadata tiket ke JSON lokal
- Metadata tiket di-upload ke mock storage (hardcoded URI untuk demo)

**Deliverable cNFT:**
- Setiap pembelian tiket = 1 mint cNFT ke wallet pembeli
- Atribut NFT: nama event, kursi, nomor tiket, timestamp
- QR code berisi: wallet address + ticket ID

**Estimasi:** 2-3 hari  
**Kesulitan:** ⭐⭐⭐⭐

---

### 🟠 Fase 3 — Anti-Calo Logic
**Tujuan:** Mekanisme anti-percaloan (max tiket/wallet, rate limiting, validasi)  
**Deliverable:**
- Batas max 4 tiket per wallet per event (cek di API sebelum mint)
- Halaman registrasi: input NIK → link ke wallet (simpan di JSON lokal)
- Cek: 1 NIK hanya bisa mendaftarkan 1 wallet
- Burn-on-redeem simulasi: scan QR → tandai "sudah dipakai" di database
- Halaman `/verify` — panitia scan QR untuk validasi masuk venue

**Estimasi:** 1-2 hari  
**Kesulitan:** ⭐⭐⭐

---

### 🔴 Fase 4 — Dashboard Promotor + Solana Pay
**Tujuan:** Promotor bisa monitor penjualan, integrasi pembayaran  
**Deliverable:**
- Halaman `/dashboard` — statistik penjualan (total terjual, revenue, chart sederhana)
- Tabel daftar pembeli + status tiket
- Simulasi Solana Pay: generate payment QR code (devnet SOL)
- Notifikasi sederhana saat tiket terjual

**Estimasi:** 1-2 hari  
**Kesulitan:** ⭐⭐⭐

---

### ❌ Fase 5 (Future Work) — Marketplace Resale + Anchor Program
**Tidak dikerjakan untuk UTS — presentasikan sebagai rencana pengembangan**  
**Kenapa kompleks:**
- Butuh Rust + Anchor framework (bahasa baru, learning curve tinggi)
- Butuh custom Solana program untuk enforce price cap on-chain
- Deploy program ke Devnet butuh testing intensif

**Alternatif untuk demo:** Jelaskan arsitekturnya di slide presentasi, tunjukkan pseudocode/diagram

---

## C. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                         │
│  ┌──────────────┐   ┌──────────────┐  ┌──────────────┐ │
│  │  Next.js 14  │   │  Phantom     │  │  QR Scanner  │ │
│  │  (React UI)  │   │  Wallet      │  │  (browser)   │ │
│  └──────┬───────┘   └──────┬───────┘  └──────────────┘ │
│         │                  │                             │
└─────────┼──────────────────┼─────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────┐
│           NEXT.JS API ROUTES            │
│         (Node.js Backend)               │
│                                         │
│  /api/tickets   → Simpan/baca tiket     │
│  /api/events    → Data event            │
│  /api/register  → NIK ↔ wallet mapping │
│  /api/verify    → Validasi QR scan      │
│                                         │
│  📁 data/ → tickets.json               │
│             events.json                 │
│             identity.json               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│         SOLANA BLOCKCHAIN               │
│           (Devnet)                      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Metaplex Bubblegum Program     │   │
│  │  (cNFT mint/transfer/burn)      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Merkle Tree Account            │   │
│  │  (menyimpan ribuan cNFT murah)  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  SPL Account Compression        │   │
│  │  (program Solana untuk cNFT)    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Mana Data On-Chain vs Off-Chain

| Data | Lokasi | Keterangan |
|------|--------|------------|
| Kepemilikan tiket (cNFT) | **On-Chain** | Tersimpan di Merkle Tree Solana |
| Signature transaksi | **On-Chain** | Bisa dicek di Explorer |
| Metadata NFT (nama, gambar) | **Off-Chain** (URI) | Hardcoded URI untuk demo, idealnya di Arweave |
| Data event (nama, tanggal, kursi) | **Off-Chain** (JSON lokal) | `data/events.json` |
| Mapping NIK ↔ wallet | **Off-Chain** (JSON lokal) | `data/identity.json` — di production, enkripsi! |
| Status QR (sudah/belum dipakai) | **Off-Chain** (JSON lokal) | Simulasi burn — di production, ini on-chain |

---

## D. Struktur Folder Proyek

```
ticketing-cnft/
├── .env.local                    # Environment variables
├── PROJECT_BRIEF.md              # File ini
├── package.json
├── next.config.ts
│
├── scripts/
│   ├── create-tree.ts            # ✅ Sudah ada — buat Merkle Tree
│   └── create-collection.ts     # Fase 2 — buat NFT Collection
│
├── data/                         # Database lokal (JSON files)
│   ├── events.json               # Data event konser
│   ├── tickets.json              # Record tiket terjual
│   └── identity.json             # Mapping NIK ↔ wallet
│
├── public/
│   ├── images/                   # Gambar event
│   └── ticket-metadata/          # Folder metadata JSON tiket (mock)
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # ✅ Sudah ada
│   │   ├── page.tsx              # ✅ Landing page
│   │   ├── wallet-wrapper.tsx    # ✅ Sudah ada
│   │   ├── globals.css           # ✅ Design system CSS
│   │   │
│   │   ├── events/               # Fase 2
│   │   │   ├── page.tsx          # Katalog event
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Detail event + beli tiket
│   │   │
│   │   ├── mint/
│   │   │   └── page.tsx          # ✅ Sudah ada — demo mint
│   │   │
│   │   ├── my-tickets/           # Fase 2
│   │   │   └── page.tsx          # Tiket yang dimiliki
│   │   │
│   │   ├── register/             # Fase 3
│   │   │   └── page.tsx          # Registrasi NIK ↔ wallet
│   │   │
│   │   ├── verify/               # Fase 3
│   │   │   └── page.tsx          # Scan QR di venue
│   │   │
│   │   ├── dashboard/            # Fase 4
│   │   │   └── page.tsx          # Dashboard promotor
│   │   │
│   │   └── api/                  # API Routes
│   │       ├── events/
│   │       │   └── route.ts      # GET events list
│   │       ├── tickets/
│   │       │   └── route.ts      # POST buy ticket, GET my tickets
│   │       ├── register/
│   │       │   └── route.ts      # POST NIK registration
│   │       └── verify/
│   │           └── route.ts      # POST verify QR
│   │
│   ├── components/
│   │   ├── WalletButton.tsx      # ✅ Sudah ada
│   │   ├── WalletProvider.tsx    # ✅ Sudah ada
│   │   ├── EventCard.tsx         # Fase 2 — card event
│   │   ├── TicketCard.tsx        # Fase 2 — card tiket dimiliki
│   │   ├── QRDisplay.tsx         # Fase 2 — tampilkan QR code
│   │   ├── Navbar.tsx            # Refactor dari inline
│   │   └── Footer.tsx            # Refactor dari inline
│   │
│   └── lib/
│       ├── umi.ts                # ✅ Setup Umi instance
│       ├── mint.ts               # ✅ Logic mint cNFT
│       ├── events.ts             # Fase 2 — helper baca/tulis events
│       ├── tickets.ts            # Fase 2 — helper manajemen tiket
│       └── identity.ts           # Fase 3 — helper NIK verification
```

---

## E. Dependencies

### Sudah Terinstall
| Package | Fungsi |
|---------|--------|
| `next` | Framework React full-stack |
| `react` + `react-dom` | Library UI |
| `typescript` | Type safety |
| `tailwindcss` | Styling |
| `@metaplex-foundation/mpl-bubblegum` | SDK untuk mint/transfer/burn cNFT (Bubblegum program) |
| `@metaplex-foundation/mpl-token-metadata` | Metadata NFT standard |
| `@metaplex-foundation/umi` | Framework Metaplex — "ORM untuk Solana" |
| `@metaplex-foundation/umi-bundle-defaults` | Setup Umi lengkap (RPC + serializers) |
| `@metaplex-foundation/umi-signer-wallet-adapters` | Jembatan Umi ↔ Phantom wallet |
| `@metaplex-foundation/umi-uploader-irys` | Upload metadata ke Irys/Arweave (Fase 2) |
| `@metaplex-foundation/umi-web3js-adapters` | Konversi tipe Umi ↔ @solana/web3.js |
| `@solana/spl-account-compression` | Low-level SDK untuk cNFT compression |
| `@solana/wallet-adapter-base` | Base types wallet adapter |
| `@solana/wallet-adapter-react` | React hooks untuk wallet (useWallet, useConnection) |
| `@solana/wallet-adapter-react-ui` | UI komponen wallet adapter (modal connect) |
| `@solana/wallet-adapter-wallets` | Daftar wallet yang didukung (Phantom, dll) |
| `@solana/web3.js` | Low-level SDK Solana |
| `bs58` | Encode/decode base58 (format address Solana) |
| `dotenv` | Load .env file di scripts Node.js |
| `tsx` | Jalankan TypeScript langsung tanpa compile |

### Perlu Ditambahkan Nanti
| Package | Fungsi | Fase |
|---------|--------|------|
| `qrcode` | Generate QR code di server | Fase 2 |
| `qrcode.react` | Render QR code di React | Fase 2 |
| `@solana/pay` | Solana Pay payment URL | Fase 4 |

---

## Prinsip Pengembangan (Wajib Dipatuhi)

1. **Planning dulu, baru eksekusi** — tiap fase disetujui dulu
2. **Bertahap** — satu fase tuntas + teruji sebelum lanjut
3. **Error message bahasa Indonesia** — user-friendly, bukan stack trace
4. **Log transaksi + link Explorer Devnet** — setiap operasi blockchain
5. **Test tiap file baru** — run, cek, baru lanjut
6. **Git commit tiap milestone** — `git commit -m "Fase X: deskripsi"`
7. **Semua di Devnet** — tidak ada SOL asli

---

## Catatan Penting untuk AI

- Saat buka sesi baru, baca file ini dulu sebelum mulai
- Cek `.env.local` — apakah TREE_ADDRESS sudah diisi?
- Cek `data/` folder — apakah sudah ada file database?
- Tanya user tentang progress fase terakhir sebelum lanjut coding
