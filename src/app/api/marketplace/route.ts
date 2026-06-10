import { NextRequest, NextResponse } from "next/server";
import { getAllTickets, updateTicketListing, updateTicketOwner } from "@/lib/tickets";

export async function GET() {
  try {
    const tickets = await getAllTickets();
    const listedTickets = tickets.filter(t => t.status === "active" && t.isForSale === true);
    
    return NextResponse.json({ success: true, data: listedTickets });
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

    if (action === "list") {
      const { resalePrice } = body;
      if (!resalePrice || resalePrice <= 0) {
        return NextResponse.json({ success: false, error: "Harga tidak valid" }, { status: 400 });
      }
      
      const updated = await updateTicketListing(ticketId, true, resalePrice);
      if (!updated) return NextResponse.json({ success: false, error: "Tiket tidak ditemukan" }, { status: 404 });
      
      return NextResponse.json({ success: true, data: updated });
    } 
    
    else if (action === "unlist") {
      const updated = await updateTicketListing(ticketId, false);
      if (!updated) return NextResponse.json({ success: false, error: "Tiket tidak ditemukan" }, { status: 404 });
      
      return NextResponse.json({ success: true, data: updated });
    }
    
    else if (action === "buy") {
      const { newOwnerWallet, signature } = body;
      if (!newOwnerWallet || !signature) {
        return NextResponse.json({ success: false, error: "Data pembeli tidak lengkap" }, { status: 400 });
      }

      // Di sistem riil, backend akan memverifikasi signature pembayaran SOL di blockchain
      // dan menjalankan smart contract escrow untuk memindahkan cNFT.
      // Untuk demo ini, kita langsung memperbarui kepemilikan di database off-chain.
      
      const updated = await updateTicketOwner(ticketId, newOwnerWallet);
      if (!updated) return NextResponse.json({ success: false, error: "Tiket tidak ditemukan" }, { status: 404 });
      
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Action tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("Marketplace POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
