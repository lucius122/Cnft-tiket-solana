/**
 * tickets.ts — Helper manajemen data tiket
 *
 * KONSEP: Record tiket disimpan off-chain di tickets.json.
 * Kepemilikan tiket yang SEBENARNYA ada di blockchain (cNFT di Solana).
 * Database lokal ini hanya menyimpan metadata tambahan seperti:
 * - Nomor kursi / kategori
 * - Status redeem (apakah sudah dipakai masuk venue)
 * - Link ke transaksi on-chain (signature)
 *
 * Di production:
 * - Gunakan database real (PostgreSQL)
 * - Status redeem juga di-verify on-chain (burn cNFT)
 */

import * as fs from "fs";
import * as path from "path";

export interface Ticket {
  id: string;            // UUID unik tiket
  eventId: string;       // ID event
  eventTitle: string;    // Nama event (disimpan untuk kemudahan)
  categoryId: string;    // Kategori kursi
  categoryName: string;  // Nama kategori
  walletAddress: string; // Public key pemilik
  price: number;         // Harga tiket (rupiah simulasi)
  mintSignature: string; // Signature transaksi cNFT mint (on-chain proof)
  mintedAt: string;      // ISO timestamp
  status: "active" | "redeemed" | "cancelled";
  ticketNumber: string;  // Nomor tiket untuk QR (format: EVT-XXXX-YYYY)
  venue: string;
  eventDate: string;
  eventTime: string;
}

const TICKETS_FILE = path.join(process.cwd(), "data", "tickets.json");

export function getAllTickets(): Ticket[] {
  try {
    const raw = fs.readFileSync(TICKETS_FILE, "utf-8");
    return JSON.parse(raw) as Ticket[];
  } catch {
    return [];
  }
}

export function getTicketsByWallet(walletAddress: string): Ticket[] {
  return getAllTickets().filter((t) => t.walletAddress === walletAddress);
}

export function getTicketById(id: string): Ticket | null {
  return getAllTickets().find((t) => t.id === id) ?? null;
}

export function getTicketByNumber(ticketNumber: string): Ticket | null {
  return getAllTickets().find((t) => t.ticketNumber === ticketNumber) ?? null;
}

export function countTicketsByWalletAndEvent(
  walletAddress: string,
  eventId: string
): number {
  return getAllTickets().filter(
    (t) => t.walletAddress === walletAddress && t.eventId === eventId && t.status !== "cancelled"
  ).length;
}

export function saveTicket(ticket: Ticket): void {
  const tickets = getAllTickets();
  tickets.push(ticket);
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

export function updateTicketStatus(
  ticketId: string,
  status: Ticket["status"]
): Ticket | null {
  const tickets = getAllTickets();
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return null;
  tickets[idx].status = status;
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
  return tickets[idx];
}

/** Generate nomor tiket unik, format: EVT-{eventCode}-{random4} */
export function generateTicketNumber(eventId: string): string {
  const code = eventId.slice(0, 4).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `${code}-${rand}${timestamp}`;
}
