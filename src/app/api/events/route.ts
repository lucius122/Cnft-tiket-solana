/**
 * API Route: GET /api/events
 * Mengembalikan semua data event konser
 */

import { NextResponse } from "next/server";
import { getAllEvents } from "@/lib/events";

export async function GET() {
  try {
    const events = getAllEvents();
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data event" },
      { status: 500 }
    );
  }
}
