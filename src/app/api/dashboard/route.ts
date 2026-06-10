import { NextResponse } from "next/server";
import { getAllEvents } from "@/lib/events";
import { getAllTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [events, tickets] = await Promise.all([
      getAllEvents(),
      getAllTickets(),
    ]);

    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let totalCapacity = 0;
    
    // Hitung dari events (ini lebih aman jika ada delay indexing di tickets)
    const eventStats = events.map(event => {
      let eventRevenue = 0;
      let eventSold = 0;
      let eventCapacity = 0;
      
      event.categories.forEach(cat => {
        eventRevenue += cat.sold * cat.price;
        eventSold += cat.sold;
        eventCapacity += cat.capacity;
      });
      
      totalRevenue += eventRevenue;
      totalTicketsSold += eventSold;
      totalCapacity += eventCapacity;
      
      return {
        id: event.id,
        title: event.title,
        revenue: eventRevenue,
        sold: eventSold,
        capacity: eventCapacity,
      };
    });
    
    // Ambil 10 transaksi terakhir dari tickets array
    const recentTransactions = [...tickets]
      .sort((a, b) => new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime())
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        eventTitle: t.eventTitle,
        categoryName: t.categoryName,
        price: t.price,
        walletAddress: t.walletAddress,
        mintedAt: t.mintedAt,
        status: t.status
      }));

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalRevenue,
          totalTicketsSold,
          totalCapacity,
          occupancyRate: totalCapacity > 0 ? (totalTicketsSold / totalCapacity) * 100 : 0
        },
        eventStats,
        recentTransactions
      }
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}
