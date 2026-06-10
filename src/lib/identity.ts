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
 * Privasi: NIK di-hash SHA-256 sebelum disimpan — sistem tidak menyimpan
 * NIK asli, hanya sidik jari digitalnya.
 *
 * Data disimpan di Vercel KV (Redis) untuk kompatibilitas dengan hosting.
 */

import crypto from "crypto";
import { kvGet, kvSet } from "./storage";

export interface Identity {
  id: string;           // UUID
  hashedNik: string;    // SHA-256 hash NIK (privasi — tidak simpan NIK asli!)
  walletAddress: string;
  name: string;         // Nama lengkap
  email: string;
  registeredAt: string;
}

export async function getAllIdentities(): Promise<Identity[]> {
  return kvGet<Identity>("identities");
}

/** Hash NIK menggunakan SHA-256 untuk proteksi privasi */
export function hashNik(nik: string): string {
  return crypto.createHash("sha256").update(nik.trim()).digest("hex");
}

/** Cek apakah NIK sudah terdaftar (bandingkan hash) */
export async function isNikRegistered(nik: string): Promise<boolean> {
  const hashed = hashNik(nik);
  const identities = await getAllIdentities();
  return identities.some((i) => i.hashedNik === hashed);
}

/** Cek apakah wallet sudah terdaftar */
export async function isWalletRegistered(walletAddress: string): Promise<boolean> {
  const identities = await getAllIdentities();
  return identities.some((i) => i.walletAddress === walletAddress);
}

/** Ambil identitas berdasarkan wallet address */
export async function getIdentityByWallet(walletAddress: string): Promise<Identity | null> {
  const identities = await getAllIdentities();
  return identities.find((i) => i.walletAddress === walletAddress) ?? null;
}

/** Daftarkan NIK baru dengan wallet */
export async function registerIdentity(data: {
  nik: string;
  walletAddress: string;
  name: string;
  email: string;
}): Promise<{ success: boolean; error?: string; identity?: Identity }> {
  if (await isNikRegistered(data.nik)) {
    return { success: false, error: "NIK ini sudah terdaftar dengan wallet lain." };
  }
  if (await isWalletRegistered(data.walletAddress)) {
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

  const identities = await getAllIdentities();
  identities.push(identity);
  await kvSet("identities", identities);

  return { success: true, identity };
}
