import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCustomers, createCustomer, CreateCustomerInput } from "@/lib/services/customerService";
import { isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? undefined;

    const customers = await getCustomers(search);
    return NextResponse.json(customers);
  } catch (error) {
    console.error("GET /api/customers:", error);
    return NextResponse.json(
      { error: "Erro ao buscar clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = (await request.json()) as CreateCustomerInput;

    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: "Campos obrigatórios: name, phone" },
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

    const customer = await createCustomer({ ...body, phone });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("POST /api/customers:", error);
    return NextResponse.json(
      { error: "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}
