/**
 * storage.ts — Abstraksi storage dengan fallback + timeout
 *
 * MODE OPERASI:
 * =====================================
 * 1. KV MODE  — Jika env KV_REST_API_URL & KV_REST_API_TOKEN tersedia,
 *               gunakan Vercel KV (Redis) untuk read/write.
 *               Semua operasi KV diberi timeout 3 detik agar tidak hang.
 * 2. FILE MODE — Jika KV tidak tersedia atau timeout,
 *               baca data dari file statis JSON di folder data/.
 *               Write disimpan di memori (in-memory) selama server hidup.
 *
 * Data model:
 * - Key "events"     → Event[]
 * - Key "tickets"    → Ticket[]
 * - Key "identities" → Identity[]
 */

import * as fs from "fs";
import * as path from "path";

const KV_TIMEOUT_MS = 3000; // 3 detik timeout untuk semua operasi KV

/* ────────────────────────────────────────────
 * Timeout Utility
 * ──────────────────────────────────────────── */

/**
 * Bungkus promise dengan timeout.
 * Jika promise tidak selesai dalam `ms` milidetik, reject dengan error.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`KV operation timed out after ${ms}ms`));
    }, ms);
    promise
      .then((val) => { clearTimeout(timer); resolve(val); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

/* ────────────────────────────────────────────
 * Deteksi apakah Vercel KV tersedia
 * ──────────────────────────────────────────── */
function isKvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Dynamic import @vercel/kv hanya saat diperlukan.
 */
async function getKv() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

/* ────────────────────────────────────────────
 * In-memory fallback store
 * ──────────────────────────────────────────── */
const memoryStore: Record<string, unknown[]> = {};

/**
 * Baca data dari file JSON statis di folder data/.
 */
function readLocalFile<T>(key: string): T[] {
  try {
    const filePath = path.join(process.cwd(), "data", `${key}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as T[];
    }
  } catch (error) {
    console.warn(`⚠️ Gagal baca file lokal untuk key "${key}":`, error);
  }
  return [];
}

/* ────────────────────────────────────────────
 * Public API
 * ──────────────────────────────────────────── */

/**
 * Ambil data berdasarkan key.
 * KV (dengan timeout) → memory fallback → file fallback.
 */
export async function kvGet<T>(key: string): Promise<T[]> {
  // --- KV Mode (dengan timeout) ---
  if (isKvConfigured()) {
    try {
      const kv = await getKv();
      const data = await withTimeout(kv.get<T[]>(key), KV_TIMEOUT_MS);
      if (data && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (error) {
      console.warn(`⚠️ KV GET gagal/timeout untuk "${key}", fallback ke file:`, (error as Error).message);
    }
  }

  // --- Memory / File fallback ---
  if (memoryStore[key] && memoryStore[key].length > 0) {
    return memoryStore[key] as T[];
  }

  const fileData = readLocalFile<T>(key);
  if (fileData.length > 0) {
    memoryStore[key] = fileData;
  }
  return fileData;
}

/**
 * Simpan data.
 * Selalu simpan ke memory. Jika KV tersedia, coba simpan juga ke KV.
 */
export async function kvSet<T>(key: string, data: T[]): Promise<void> {
  // Selalu simpan ke memory
  memoryStore[key] = data;

  // Jika KV tersedia, simpan juga ke KV (non-blocking)
  if (isKvConfigured()) {
    try {
      const kv = await getKv();
      await withTimeout(kv.set(key, data), KV_TIMEOUT_MS);
    } catch (error) {
      console.warn(`⚠️ KV SET gagal/timeout untuk "${key}":`, (error as Error).message);
    }
  }
}

/**
 * Seed events data ke KV jika belum ada.
 * Jika KV tidak tersedia, skip — kvGet akan fallback ke file.
 */
export async function seedEventsIfEmpty(): Promise<void> {
  if (!isKvConfigured()) {
    return;
  }

  try {
    const kv = await getKv();
    const existing = await withTimeout(kv.get("events"), KV_TIMEOUT_MS);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return;
    }

    const filePath = path.join(process.cwd(), "data", "events.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const events = JSON.parse(raw);
    await withTimeout(kv.set("events", events), KV_TIMEOUT_MS);
    console.log("✅ Events data seeded to KV from events.json");
  } catch (error) {
    console.warn("⚠️ Seed events gagal/timeout, will use file fallback:", (error as Error).message);
  }
}
