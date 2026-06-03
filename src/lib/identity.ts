/**
 * identity.ts — Helper verifikasi NIK ↔ Wallet (Anti-Calo)
 *
 * KONSEP: Sistem Anti-Calo
 * ========================
 * Calo biasanya pakai banyak akun untuk borong tiket.
 * Solusi kita: 1 NIK (Nomor Induk Kependudukan) hanya boleh terhubung
 * ke 1 wallet. Karena tiket terhubung ke wallet, calo tidak bisa
 * punya banyak wallet yang berbeda untuk 1 orang.
 *
 * Untuk demo: NIK disimpan as-is di JSON (di production harus di-hash/enkripsi!)
 * Di production nyata, verifikasi NIK butuh integrasi dengan Dukcapil.
 *
 * Batasan tambahan:
 * - Max 4 tiket per wallet per event (dikek di tickets.ts)
 */

import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

export interface Identity {
  id: string;           // UUID
  hashedNik: string;    // SHA-256 hash NIK (privasi — tidak simpan NIK asli!)
  walletAddress: string;
  name: string;         // Nama lengkap
  email: string;
  registeredAt: string;
}

const IDENTITY_FILE = path.join(process.cwd(), "data", "identity.json");

export function getAllIdentities(): Identity[] {
  try {
    const raw = fs.readFileSync(IDENTITY_FILE, "utf-8");
    return JSON.parse(raw) as Identity[];
  } catch {
    return [];
  }
}

/** Hash NIK menggunakan SHA-256 untuk proteksi privasi */
export function hashNik(nik: string): string {
  return crypto.createHash("sha256").update(nik.trim()).digest("hex");
}

/** Cek apakah NIK sudah terdaftar (bandingkan hash) */
export function isNikRegistered(nik: string): boolean {
  const hashed = hashNik(nik);
  return getAllIdentities().some((i) => i.hashedNik === hashed);
}

/** Cek apakah wallet sudah terdaftar */
export function isWalletRegistered(walletAddress: string): boolean {
  return getAllIdentities().some((i) => i.walletAddress === walletAddress);
}

/** Ambil identitas berdasarkan wallet address */
export function getIdentityByWallet(walletAddress: string): Identity | null {
  return getAllIdentities().find((i) => i.walletAddress === walletAddress) ?? null;
}

/** Daftarkan NIK baru dengan wallet */
export function registerIdentity(data: {
  nik: string;
  walletAddress: string;
  name: string;
  email: string;
}): { success: boolean; error?: string; identity?: Identity } {
  if (isNikRegistered(data.nik)) {
    return { success: false, error: "NIK ini sudah terdaftar dengan wallet lain." };
  }
  if (isWalletRegistered(data.walletAddress)) {
    return { success: false, error: "Wallet ini sudah terdaftar dengan NIK lain." };
  }

  const identity: Identity = {
    id: crypto.randomUUID(),
    hashedNik: hashNik(data.nik),
    walletAddress: data.walletAddress,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    registeredAt: new Date().toISOString(),
  };

  const identities = getAllIdentities();
  identities.push(identity);
  fs.writeFileSync(IDENTITY_FILE, JSON.stringify(identities, null, 2));

  return { success: true, identity };
}
