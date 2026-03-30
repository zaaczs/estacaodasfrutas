import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };

    if (!body.name || !body.email || !body.password || !body.phone) {
      return NextResponse.json(
        { error: "Campos obrigatórios: name, email, password, phone" },
        { status: 400 }
      );
    }

    const phone = normalizePhoneDigits(body.phone);
    if (!isValidPhoneDigits(phone)) {
      return NextResponse.json(
        { error: "Telefone inválido. Use DDD + número (10 ou 11 dígitos)." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
    }

    const hashedPassword = await hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: "CUSTOMER",
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone,
    });
  } catch (error) {
    console.error("POST /api/auth/customer-register:", error);
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 });
  }
}
