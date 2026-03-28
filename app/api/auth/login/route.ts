/**
 * POST /api/auth/login
 * Verifies credentials and issues a session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Use a constant-time comparison to avoid timing attacks
    const passwordMatch =
      user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      avatar: user.avatar,
    });

    return NextResponse.json({ message: "Logged in.", role: user.role });
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
