/**
 * tickets.ts — Helper manajemen data tiket
 *
 * KONSEP: Record tiket disimpan di Vercel KV (Redis).
 * Kepemilikan tiket yang SEBENARNYA ada di blockchain (cNFT di Solana).
 * Database KV ini hanya menyimpan metadata tambahan seperti:
 * - Nomor kursi / kategori
 * - Status redeem (apakah sudah dipakai masuk venue)
 * - Link ke transaksi on-chain (signature)
 *
 * Di production:
 * - Gunakan database real (PostgreSQL)
 * - Status redeem juga di-verify on-chain (burn cNFT)
 */

import { kvGet, kvSet } from "./storage";

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
  
  // Fitur Marketplace Resale
  isForSale?: boolean;
  resalePrice?: number;
}

export async function getAllTickets(): Promise<Ticket[]> {
  return kvGet<Ticket>("tickets");
}

export async function getTicketsByWallet(walletAddress: string): Promise<Ticket[]> {
  const all = await getAllTickets();
  return all.filter((t) => t.walletAddress === walletAddress);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const all = await getAllTickets();
  return all.find((t) => t.id === id) ?? null;
}

export async function getTicketByNumber(ticketNumber: string): Promise<Ticket | null> {
  const all = await getAllTickets();
  return all.find((t) => t.ticketNumber === ticketNumber) ?? null;
}

export async function countTicketsByWalletAndEvent(
  walletAddress: string,
  eventId: string
): Promise<number> {
  const all = await getAllTickets();
  return all.filter(
    (t) => t.walletAddress === walletAddress && t.eventId === eventId && t.status !== "cancelled"
  ).length;
}

export async function saveTicket(ticket: Ticket): Promise<void> {
  const tickets = await getAllTickets();
  tickets.push(ticket);
  await kvSet("tickets", tickets);
}

export async function updateTicketStatus(
  ticketId: string,
  status: Ticket["status"]
): Promise<Ticket | null> {
  const tickets = await getAllTickets();
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return null;
  tickets[idx].status = status;
  await kvSet("tickets", tickets);
  return tickets[idx];
}

/** Generate nomor tiket unik, format: EVT-{eventCode}-{random4} */
export function generateTicketNumber(eventId: string): string {
  const code = eventId.slice(0, 4).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `${code}-${rand}${timestamp}`;
}

export async function updateTicketListing(
  ticketId: string,
  isForSale: boolean,
  resalePrice?: number
): Promise<Ticket | null> {
  const tickets = await getAllTickets();
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return null;
  
  tickets[idx].isForSale = isForSale;
  if (resalePrice !== undefined) {
    tickets[idx].resalePrice = resalePrice;
  }
  
  await kvSet("tickets", tickets);
  return tickets[idx];
}

export async function updateTicketOwner(
  ticketId: string,
  newOwnerAddress: string
): Promise<Ticket | null> {
  const tickets = await getAllTickets();
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return null;
  
  tickets[idx].walletAddress = newOwnerAddress;
  tickets[idx].isForSale = false; // Batalkan listing setelah terjual
  
  await kvSet("tickets", tickets);
  return tickets[idx];
}
