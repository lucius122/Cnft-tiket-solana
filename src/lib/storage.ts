/**
 * storage.ts — Abstraksi storage menggunakan Vercel KV (Redis)
 *
 * KONSEP: Kenapa pindah dari fs ke KV?
 * =====================================
 * Vercel serverless functions berjalan di container read-only.
 * fs.writeFileSync() akan selalu gagal di production.
 * Vercel KV (Redis) menyediakan key-value store yang persisten
 * dan bisa diakses dari edge/serverless functions.
 *
 * Data model:
 * - Key "events"     → JSON string Event[]
 * - Key "tickets"    → JSON string Ticket[]
 * - Key "identities" → JSON string Identity[]
 *
 * Saat pertama kali diakses (KV kosong), data events
 * di-seed dari file statis data/events.json yang ikut ter-deploy.
 */

import { kv } from "@vercel/kv";
import * as fs from "fs";
import * as path from "path";

/**
 * Ambil data dari KV berdasarkan key.
 * Mengembalikan array kosong jika key belum ada.
 */
export async function kvGet<T>(key: string): Promise<T[]> {
  try {
    const data = await kv.get<T[]>(key);
    return data ?? [];
  } catch (error) {
    console.error(`KV GET error for key "${key}":`, error);
    return [];
  }
}

/**
 * Simpan data ke KV.
 */
export async function kvSet<T>(key: string, data: T[]): Promise<void> {
  try {
    await kv.set(key, data);
  } catch (error) {
    console.error(`KV SET error for key "${key}":`, error);
    throw error;
  }
}

/**
 * Seed events data dari file statis ke KV jika belum ada.
 * Dipanggil saat pertama kali getAllEvents() dijalankan.
 */
export async function seedEventsIfEmpty(): Promise<void> {
  const existing = await kv.get("events");
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return; // Sudah ada data, tidak perlu seed
  }

  try {
    // Baca dari file statis yang ikut ter-deploy
    const filePath = path.join(process.cwd(), "data", "events.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const events = JSON.parse(raw);
    await kv.set("events", events);
    console.log("✅ Events data seeded to KV from events.json");
  } catch (error) {
    console.error("⚠️ Failed to seed events:", error);
  }
}
