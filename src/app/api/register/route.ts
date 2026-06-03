/**
 * API Route: POST /api/register
 * Mendaftarkan NIK ↔ Wallet (Anti-Calo)
 */

import { NextRequest, NextResponse } from "next/server";
import { registerIdentity, isWalletRegistered, getIdentityByWallet } from "@/lib/identity";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Parameter wallet diperlukan" },
        { status: 400 }
      );
    }

    const registered = isWalletRegistered(wallet);
    if (registered) {
      const identity = getIdentityByWallet(wallet);
      return NextResponse.json({
        success: true,
        registered: true,
        data: {
          name: identity?.name,
          registeredAt: identity?.registeredAt,
        },
      });
    }

    return NextResponse.json({ success: true, registered: false });
  } catch (error) {
    console.error("Error checking registration:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memeriksa status registrasi" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nik, walletAddress, name, email } = body;

    // Validasi input
    if (!nik || !walletAddress || !name || !email) {
      return NextResponse.json(
        { success: false, error: "Semua field wajib diisi: NIK, walletAddress, nama, email" },
        { status: 400 }
      );
    }

    // Validasi format NIK (16 digit)
    const nikClean = nik.replace(/\s/g, "");
    if (!/^\d{16}$/.test(nikClean)) {
      return NextResponse.json(
        { success: false, error: "NIK harus 16 digit angka" },
        { status: 400 }
      );
    }

    // Validasi email
    if (!email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Format email tidak valid" },
        { status: 400 }
      );
    }

    const result = registerIdentity({
      nik: nikClean,
      walletAddress,
      name,
      email,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 409 } // Conflict
      );
    }

    console.log(`✅ Identitas terdaftar: ${name} → ${walletAddress}`);

    return NextResponse.json({
      success: true,
      message: "Identitas berhasil didaftarkan! Kamu sekarang bisa membeli tiket.",
      data: {
        name: result.identity?.name,
        registeredAt: result.identity?.registeredAt,
      },
    });
  } catch (error) {
    console.error("Error registering identity:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat mendaftarkan identitas" },
      { status: 500 }
    );
  }
}
