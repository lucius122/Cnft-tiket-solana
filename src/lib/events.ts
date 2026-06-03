/**
 * events.ts — Helper untuk membaca data event konser
 *
 * KONSEP: Data event disimpan off-chain di file JSON lokal.
 * Di production, ini akan diganti dengan database (PostgreSQL/MongoDB).
 * Untuk demo UTS, JSON sudah cukup untuk menunjukkan konsep.
 */

import * as fs from "fs";
import * as path from "path";

export interface TicketCategory {
  id: string;
  name: string;
  price: number; // dalam rupiah (simulasi)
  capacity: number;
  sold: number;
  color: string;
}

export interface Event {
  id: string;
  title: string;
  artist: string;
  venue: string;
  date: string;
  time: string;
  description: string;
  posterUrl: string;
  categories: TicketCategory[];
  maxPerWallet: number;
  tags: string[];
  status: "on-sale" | "coming-soon" | "sold-out";
}

const EVENTS_FILE = path.join(process.cwd(), "data", "events.json");

export function getAllEvents(): Event[] {
  try {
    const raw = fs.readFileSync(EVENTS_FILE, "utf-8");
    return JSON.parse(raw) as Event[];
  } catch {
    return [];
  }
}

export function getEventById(id: string): Event | null {
  const events = getAllEvents();
  return events.find((e) => e.id === id) ?? null;
}

export function updateEventSoldCount(
  eventId: string,
  categoryId: string,
  delta: number
): void {
  const events = getAllEvents();
  const event = events.find((e) => e.id === eventId);
  if (!event) return;
  const cat = event.categories.find((c) => c.id === categoryId);
  if (!cat) return;
  cat.sold = Math.max(0, cat.sold + delta);
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}
