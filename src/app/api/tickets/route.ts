/**
 * API Route: GET/POST /api/tickets
 *
 * GET  /api/tickets?wallet=<address>  → Ambil tiket milik wallet
 * POST /api/tickets                   → Beli tiket baru (setelah mint cNFT)
 *
 * FLOW PEMBELIAN TIKET:
 * 1. Frontend mint cNFT → dapat signature transaksi
 * 2. Frontend POST ke API ini dengan data tiket + signature
 * 3. API simpan record ke tickets.json
 * 4. Update sold count di events.json
 *
 * VALIDASI ANTI-CALO (server-side):
 * - Cek wallet sudah registrasi NIK
 * - Cek max 4 tiket/wallet/event
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  getAllTickets,
  getTicketsByWallet,
  countTicketsByWalletAndEvent,
  saveTicket,
  generateTicketNumber,
} from "@/lib/tickets";
import { getEventById, updateEventSoldCount } from "@/lib/events";
import { isWalletRegistered } from "@/lib/identity";

// GET: ambil tiket berdasarkan wallet atau semua tiket
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    if (wallet) {
      const tickets = await getTicketsByWallet(wallet);
      return NextResponse.json({ success: true, data: tickets });
    }

    // Tanpa parameter → return semua (untuk dashboard promotor)
    const tickets = await getAllTickets();
    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data tiket" },
      { status: 500 }
    );
  }
}

// POST: beli tiket baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, eventId, categoryId, mintSignature } = body;

    // Validasi input
    if (!walletAddress || !eventId || !categoryId || !mintSignature) {
      return NextResponse.json(
        { success: false, error: "Data tidak lengkap: walletAddress, eventId, categoryId, mintSignature diperlukan" },
        { status: 400 }
      );
    }

    // Cek wallet sudah registrasi NIK (anti-calo)
    if (!(await isWalletRegistered(walletAddress))) {
      return NextResponse.json(
        { success: false, error: "Wallet belum terdaftar! Daftar NIK kamu terlebih dahulu di halaman Registrasi." },
        { status: 403 }
      );
    }

    // Ambil data event
    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek event masih on-sale
    if (event.status !== "on-sale") {
      return NextResponse.json(
        { success: false, error: "Tiket event ini belum/sudah tidak tersedia" },
        { status: 400 }
      );
    }

    // Ambil kategori
    const category = event.categories.find((c) => c.id === categoryId);
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Kategori tiket tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek kapasitas
    if (category.sold >= category.capacity) {
      return NextResponse.json(
        { success: false, error: `Tiket ${category.name} sudah habis terjual!` },
        { status: 400 }
      );
    }

    // ANTI-CALO: cek max tiket per wallet per event
    const existingCount = await countTicketsByWalletAndEvent(walletAddress, eventId);
    if (existingCount >= event.maxPerWallet) {
      return NextResponse.json(
        {
          success: false,
          error: `Kamu sudah memiliki ${existingCount} tiket untuk event ini. Maksimal ${event.maxPerWallet} tiket per orang per event.`,
        },
        { status: 403 }
      );
    }

    // Buat record tiket baru
    const ticket = {
      id: uuidv4(),
      eventId,
      eventTitle: event.title,
      categoryId,
      categoryName: category.name,
      walletAddress,
      price: category.price,
      mintSignature,
      mintedAt: new Date().toISOString(),
      status: "active" as const,
      ticketNumber: generateTicketNumber(eventId),
      venue: event.venue,
      eventDate: event.date,
      eventTime: event.time,
    };

    // Simpan tiket
    await saveTicket(ticket);

    // Update sold count event
    await updateEventSoldCount(eventId, categoryId, 1);

    console.log(`✅ Tiket baru: ${ticket.ticketNumber} untuk ${walletAddress}`);

    return NextResponse.json({
      success: true,
      data: ticket,
      message: "Tiket berhasil dibeli dan dicatat!",
    });
  } catch (error) {
    console.error("Error buying ticket:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat memproses pembelian tiket" },
      { status: 500 }
    );
  }
}
