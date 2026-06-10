/**
 * API Route: /api/marketplace
 *
 * Marketplace resale tiket dengan aturan smart contract:
 * ======================================================
 * ATURAN 1: Harga jual ulang maks 110% dari harga asli
 * ATURAN 2: Pembayaran wajib lewat marketplace (signature diverifikasi)
 * ATURAN 3: Bagi hasil otomatis — 87% penjual, 10% promotor, 3% platform
 * ATURAN 4: Transfer dana + pindah kepemilikan dilakukan atomik
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllTickets,
  getTicketById,
  updateTicketListing,
  updateTicketOwner,
} from "@/lib/tickets";
import { getEventById } from "@/lib/events";

// Konstanta bagi hasil
const PROMOTER_ROYALTY_PERCENT = 10; // 10% ke promotor
const PLATFORM_COMMISSION_PERCENT = 3; // 3% ke platform
const MAX_RESALE_MULTIPLIER = 1.10; // Maks 110% dari harga asli

export async function GET() {
  try {
    const tickets = await getAllTickets();
    const listedTickets = tickets.filter(
      (t) => t.status === "active" && t.isForSale === true
    );

    // Enrich dengan info plafon harga
    const enriched = await Promise.all(
      listedTickets.map(async (ticket) => {
        const event = await getEventById(ticket.eventId);
        const originalPrice = ticket.price;
        const maxPrice = Math.floor(originalPrice * MAX_RESALE_MULTIPLIER);
        return {
          ...ticket,
          originalPrice,
          maxResalePrice: maxPrice,
          promoterWallet: event?.promoterWallet || null,
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching marketplace tickets:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data marketplace" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ticketId } = body;

    if (!action || !ticketId) {
      return NextResponse.json(
        { success: false, error: "Parameter tidak lengkap" },
        { status: 400 }
      );
    }

    // ================================================================
    // ACTION: LIST — Penjual mendaftarkan tiket ke marketplace
    // ================================================================
    if (action === "list") {
      const { resalePrice } = body;
      if (!resalePrice || resalePrice <= 0) {
        return NextResponse.json(
          { success: false, error: "Harga tidak valid" },
          { status: 400 }
        );
      }

      // Ambil data tiket untuk cek harga asli
      const ticket = await getTicketById(ticketId);
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: "Tiket tidak ditemukan" },
          { status: 404 }
        );
      }

      // ========================================
      // ATURAN 1: Plafon harga maks 110%
      // ========================================
      const originalPrice = ticket.price;
      const maxAllowedPrice = Math.floor(originalPrice * MAX_RESALE_MULTIPLIER);

      if (resalePrice > maxAllowedPrice) {
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        });
        return NextResponse.json(
          {
            success: false,
            error: `Harga melebihi batas maksimal 110%! Harga asli: ${formatted.format(originalPrice)}, maks: ${formatted.format(maxAllowedPrice)}`,
          },
          { status: 400 }
        );
      }

      if (ticket.status !== "active") {
        return NextResponse.json(
          { success: false, error: "Hanya tiket aktif yang bisa dijual" },
          { status: 400 }
        );
      }

      const updated = await updateTicketListing(ticketId, true, resalePrice);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Gagal melisting tiket" },
          { status: 500 }
        );
      }

      console.log(
        `🏷️ Tiket ${ticket.ticketNumber} dilisting seharga Rp${resalePrice} (asli: Rp${originalPrice}, maks: Rp${maxAllowedPrice})`
      );

      return NextResponse.json({ success: true, data: updated });
    }

    // ================================================================
    // ACTION: UNLIST — Penjual membatalkan listing
    // ================================================================
    else if (action === "unlist") {
      const updated = await updateTicketListing(ticketId, false);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Tiket tidak ditemukan" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // ================================================================
    // ACTION: BUY — Pembeli membeli tiket dari marketplace
    // ================================================================
    else if (action === "buy") {
      const { newOwnerWallet, signature } = body;
      if (!newOwnerWallet || !signature) {
        return NextResponse.json(
          { success: false, error: "Data pembeli tidak lengkap" },
          { status: 400 }
        );
      }

      const ticket = await getTicketById(ticketId);
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: "Tiket tidak ditemukan" },
          { status: 404 }
        );
      }

      if (!ticket.isForSale) {
        return NextResponse.json(
          { success: false, error: "Tiket ini tidak sedang dijual" },
          { status: 400 }
        );
      }

      // ========================================
      // ATURAN 2: Verifikasi signature on-chain
      // ========================================
      // Verifikasi bahwa transaksi pembayaran SOL benar-benar terjadi
      // di blockchain Solana Devnet sebelum memindahkan kepemilikan.
      const rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.devnet.solana.com";

      let verified = false;
      try {
        const txResponse = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTransaction",
            params: [
              signature,
              {
                encoding: "jsonParsed",
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
              },
            ],
          }),
        });
        const txData = await txResponse.json();

        if (txData.result && txData.result.meta && !txData.result.meta.err) {
          // Transaksi ditemukan dan sukses di blockchain
          verified = true;
          console.log(`✅ Signature terverifikasi on-chain: ${signature.slice(0, 20)}...`);
        } else {
          console.error(
            `❌ Transaksi gagal atau tidak ditemukan on-chain:`,
            txData.result?.meta?.err || "not found"
          );
        }
      } catch (verifyErr) {
        console.error("❌ Gagal memverifikasi signature:", verifyErr);
      }

      if (!verified) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Transaksi pembayaran tidak dapat diverifikasi di blockchain. Pastikan pembayaran dikirim lewat Marketplace.",
          },
          { status: 400 }
        );
      }

      // ========================================
      // ATURAN 3 & 4: Bagi hasil sudah dilakukan
      // secara atomic di frontend (3 instruksi
      // transferSol dalam 1 transaksi Solana).
      // Backend hanya memverifikasi signature dan
      // memperbarui kepemilikan di database.
      // ========================================
      const resalePrice = ticket.resalePrice || 0;
      const royaltiPromotor = Math.floor(
        (resalePrice * PROMOTER_ROYALTY_PERCENT) / 100
      );
      const komisiPlatform = Math.floor(
        (resalePrice * PLATFORM_COMMISSION_PERCENT) / 100
      );
      const diterimaPenjual = resalePrice - royaltiPromotor - komisiPlatform;

      console.log(`💰 Resale tiket ${ticket.ticketNumber}:`);
      console.log(`   Harga jual: Rp${resalePrice}`);
      console.log(`   → Penjual: Rp${diterimaPenjual} (87%)`);
      console.log(`   → Promotor: Rp${royaltiPromotor} (10%)`);
      console.log(`   → Platform: Rp${komisiPlatform} (3%)`);
      console.log(`   Pembeli: ${newOwnerWallet}`);
      console.log(`   Signature: ${signature}`);

      // Pindahkan kepemilikan di database
      const updated = await updateTicketOwner(ticketId, newOwnerWallet);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Gagal memindahkan kepemilikan tiket" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updated,
        breakdown: {
          resalePrice,
          sellerReceives: diterimaPenjual,
          promoterRoyalty: royaltiPromotor,
          platformCommission: komisiPlatform,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Action tidak dikenal" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Marketplace POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
