import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  UpdateCustomerInput,
} from "@/lib/services/customerService";
import { isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const customer = await getCustomerById(id);

    if (!customer) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("GET /api/customers/[id]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cliente" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateCustomerInput;

    if (body.phone != null) {
      const normalized = normalizePhoneDigits(body.phone);
      if (!isValidPhoneDigits(normalized)) {
        return NextResponse.json(
          { error: "Telefone inválido. Use DDD + número (10 ou 11 dígitos)." },
          { status: 400 }
        );
      }
      body.phone = normalized;
    }

    const customer = await updateCustomer(id, body);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("PATCH /api/customers/[id]:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await deleteCustomer(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/customers/[id]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir cliente" },
      { status: 500 }
    );
  }
}
