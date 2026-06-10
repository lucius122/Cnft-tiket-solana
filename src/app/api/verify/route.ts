/**
 * API Route: POST /api/verify
 * Verifikasi QR code tiket di venue (scan oleh panitia)
 *
 * KONSEP: Burn-on-Redeem (Simulasi)
 * ==================================
 * Di sistem nyata: setelah scan, cNFT di-burn (dihapus dari blockchain)
 * sehingga tidak bisa dipakai lagi. Ini membuktikan tiket hanya bisa
 * dipakai sekali.
 *
 * Untuk demo: kita tandai tiket sebagai "redeemed" di database lokal.
 * Konsep yang sama, tapi burn on-chain = future work (butuh Anchor program).
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicketByNumber, updateTicketStatus } from "@/lib/tickets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketNumber } = body;

    if (!ticketNumber) {
      return NextResponse.json(
        { success: false, error: "Nomor tiket diperlukan" },
        { status: 400 }
      );
    }

    // Cari tiket berdasarkan nomor
    const ticket = await getTicketByNumber(ticketNumber.toUpperCase());

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "❌ Tiket tidak ditemukan dalam sistem!",
        },
        { status: 404 }
      );
    }

    // Cek status tiket
    if (ticket.status === "redeemed") {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "❌ Tiket ini sudah digunakan sebelumnya!",
          ticket: {
            ticketNumber: ticket.ticketNumber,
            eventTitle: ticket.eventTitle,
            categoryName: ticket.categoryName,
            status: ticket.status,
          },
        },
        { status: 400 }
      );
    }

    if (ticket.status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "❌ Tiket ini telah dibatalkan!",
        },
        { status: 400 }
      );
    }

    // Tandai tiket sebagai sudah digunakan
    const updated = await updateTicketStatus(ticket.id, "redeemed");

    console.log(`✅ Tiket di-redeem: ${ticketNumber} oleh ${ticket.walletAddress}`);

    return NextResponse.json({
      success: true,
      valid: true,
      message: "✅ Tiket VALID! Silakan masuk.",
      ticket: {
        ticketNumber: updated?.ticketNumber,
        eventTitle: updated?.eventTitle,
        categoryName: updated?.categoryName,
        walletAddress: updated?.walletAddress,
        venue: updated?.venue,
        eventDate: updated?.eventDate,
        eventTime: updated?.eventTime,
        redeemedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error verifying ticket:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat verifikasi tiket" },
      { status: 500 }
    );
  }
}

// GET: cek status tiket tanpa redeem (untuk preview)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketNumber = searchParams.get("ticketNumber");

    if (!ticketNumber) {
      return NextResponse.json(
        { success: false, error: "Parameter ticketNumber diperlukan" },
        { status: 400 }
      );
    }

    const ticket = await getTicketByNumber(ticketNumber.toUpperCase());

    if (!ticket) {
      return NextResponse.json({ success: true, found: false });
    }

    return NextResponse.json({
      success: true,
      found: true,
      ticket: {
        ticketNumber: ticket.ticketNumber,
        eventTitle: ticket.eventTitle,
        categoryName: ticket.categoryName,
        status: ticket.status,
        eventDate: ticket.eventDate,
        venue: ticket.venue,
      },
    });
  } catch (error) {
    console.error("Error checking ticket:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memeriksa tiket" },
      { status: 500 }
    );
  }
}
