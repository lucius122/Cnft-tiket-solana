/**
 * events.ts — Helper untuk membaca data event konser
 *
 * KONSEP: Data event disimpan di Vercel KV (Redis).
 * Saat pertama kali diakses, data di-seed dari file statis events.json.
 * Setelah itu, semua read/write dilakukan via KV.
 */

import { kvGet, kvSet, seedEventsIfEmpty } from "./storage";

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
  promoterWallet?: string; // Wallet promotor untuk menerima royalti resale
}

export async function getAllEvents(): Promise<Event[]> {
  await seedEventsIfEmpty();
  return kvGet<Event>("events");
}

export async function getEventById(id: string): Promise<Event | null> {
  const events = await getAllEvents();
  return events.find((e) => e.id === id) ?? null;
}

export async function updateEventSoldCount(
  eventId: string,
  categoryId: string,
  delta: number
): Promise<void> {
  const events = await getAllEvents();
  const event = events.find((e) => e.id === eventId);
  if (!event) return;
  const cat = event.categories.find((c) => c.id === categoryId);
  if (!cat) return;
  cat.sold = Math.max(0, cat.sold + delta);
  await kvSet("events", events);
}
